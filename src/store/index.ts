import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  isAnyOf,
  type Reducer,
  type UnknownAction,
} from "@reduxjs/toolkit";
import { findBusinessApi } from "./api/findBusinessApi";
import searchReducer from "./slices/searchSlice";
import settingsReducer, * as settings from "./slices/settingsSlice";
import leadsReducer, * as leads from "./slices/leadsSlice";
import analysisReducer, { clearAnalysis, runAnalysis } from "./slices/analysisSlice";
import sessionReducer, { signedOut, type SessionState } from "./slices/sessionSlice";
import activitiesReducer, {
  activityAdded,
  activityRemoved,
  newActivity,
} from "./slices/activitiesSlice";
import { formatDateISO } from "@/lib/followUp";
import { getDataAdapter } from "@/lib/data";
import { notify } from "@/lib/notify";
import { feedback } from "./feedback";

const appReducer = combineReducers({
  session: sessionReducer,
  search: searchReducer,
  settings: settingsReducer,
  leads: leadsReducer,
  analysis: analysisReducer,
  activities: activitiesReducer,
  [findBusinessApi.reducerPath]: findBusinessApi.reducer,
});

/** Ao sair da conta, os dados do usuário anterior somem da memória. */
type AppState = ReturnType<typeof appReducer>;
const rootReducer: Reducer<AppState, UnknownAction, Partial<AppState>> = (state, action) => {
  if (signedOut.match(action) && state) {
    return appReducer(
      {
        ...state,
        settings: undefined as never,
        leads: undefined as never,
        analysis: undefined as never,
        search: undefined as never,
        [findBusinessApi.reducerPath]: undefined as never,
      },
      action,
    );
  }
  return appReducer(state as AppState | undefined, action);
};

// ─────────────────────────────────────────────────────────────
// Persistência: cada ação que muda dados chama o adaptador ativo
// (localStorage no modo local, Supabase com login). O toast de sucesso só
// aparece depois que o salvamento deu certo; se falhar, aparece o erro.
// ─────────────────────────────────────────────────────────────
const persistence = createListenerMiddleware();

function reportSaveError(err: unknown) {
  console.error(err);
  notify.error("Não foi possível salvar", err);
}

const statusLabel = (id: string) => leads.LEAD_STATUS.find((s) => s.id === id)?.label ?? id;

/**
 * Fila por lead: as gravações de um mesmo lead acontecem em ordem.
 * Necessário porque o histórico (lead_activities) aponta para o lead: a linha do lead
 * precisa existir antes da primeira atividade.
 */
const leadQueues = new Map<string, Promise<unknown>>();
function enqueue<T>(placeId: string, task: () => Promise<T>): Promise<T> {
  const previous = leadQueues.get(placeId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  leadQueues.set(placeId, next);
  return next;
}

/** Anotações esperam a pessoa parar de digitar antes de salvar. */
const noteTimers = new Map<string, ReturnType<typeof setTimeout>>();

persistence.startListening({
  matcher: isAnyOf(
    leads.saveLead,
    leads.restoreLead,
    leads.setLeadStatus,
    leads.setLeadNotes,
    leads.markContacted,
    leads.setFollowUp,
  ),
  effect: (action, api) => {
    const adapter = getDataAdapter();
    if (!adapter) return;
    const payload = (action as unknown as { payload: unknown }).payload as
      { business?: { placeId: string }; placeId?: string } | string;
    const placeId =
      typeof payload === "string" ? payload : (payload.placeId ?? payload.business?.placeId);
    if (!placeId) return;

    const before = (api.getOriginalState() as RootState).leads.byId[placeId];

    /** Mensagem de sucesso de cada ação (null = sem toast). */
    const successToast = (): [string, string?] | null => {
      const lead = (api.getState() as RootState).leads.byId[placeId];
      const name = lead?.business.name;
      if (leads.saveLead.match(action)) return before ? null : ["Lead salvo", name];
      if (leads.restoreLead.match(action)) return ["Lead restaurado", name];
      if (leads.setLeadStatus.match(action))
        return ["Etapa atualizada", `${name}: ${statusLabel(action.payload.status)}`];
      if (leads.setLeadNotes.match(action)) return ["Anotação salva", name];
      if (leads.setFollowUp.match(action)) {
        const on = action.payload.on;
        return on
          ? ["Próximo contato agendado", `${name}: ${formatDateISO(on)}`]
          : ["Próximo contato removido", name];
      }
      if (leads.markContacted.match(action)) {
        const followUp =
          lead?.nextFollowUpOn && lead.nextFollowUpOn !== before?.nextFollowUpOn
            ? `Retorno agendado para ${formatDateISO(lead.nextFollowUpOn)}`
            : name;
        return before?.status === "novo"
          ? ["Lead movido para “Contatado”", followUp]
          : ["Contato registrado", followUp];
      }
      return null;
    };

    const save = () => {
      const lead = (api.getState() as RootState).leads.byId[placeId];
      if (!lead) return;
      enqueue(placeId, () => adapter.saveLead(lead))
        .then(() => {
          const t = successToast();
          if (t) notify.success(t[0], { description: t[1] });
        })
        .catch(reportSaveError);
    };

    if (leads.setLeadNotes.match(action)) {
      clearTimeout(noteTimers.get(placeId));
      noteTimers.set(placeId, setTimeout(save, 700));
    } else {
      save();
    }
  },
});

persistence.startListening({
  actionCreator: leads.removeLead,
  effect: (action, api) => {
    const removed = (api.getOriginalState() as RootState).leads.byId[action.payload];
    const adapter = getDataAdapter();
    if (!adapter) return;
    enqueue(action.payload, () => adapter.deleteLead(action.payload))
      .then(() => {
        if (!removed) return;
        notify.info("Lead removido", {
          description: removed.business.name,
          action: {
            label: "Desfazer",
            onPress: () => api.dispatch(leads.restoreLead(removed)),
          },
        });
      })
      .catch(reportSaveError);
  },
});

// A análise já tem o próprio toast (resultado da API); salvar o resultado é silencioso.
persistence.startListening({
  actionCreator: runAnalysis.fulfilled,
  effect: (action) => {
    getDataAdapter()?.saveAnalysis(action.meta.arg.id, action.payload).catch(reportSaveError);
  },
});

persistence.startListening({
  actionCreator: clearAnalysis,
  effect: (action) => {
    getDataAdapter()?.deleteAnalysis(action.payload).catch(reportSaveError);
  },
});

// ─────────────────────────────────────────────────────────────
// Histórico: cada ação relevante vira uma linha em lead_activities.
// ─────────────────────────────────────────────────────────────
persistence.startListening({
  actionCreator: activityAdded,
  effect: ({ payload: a }, api) => {
    const adapter = getDataAdapter();
    if (!adapter) return;
    enqueue(a.placeId, () => adapter.addActivity(a))
      .then(() => {
        if (a.type === "note") notify.success("Anotação adicionada ao histórico");
      })
      .catch((err) => {
        api.dispatch(activityRemoved({ placeId: a.placeId, id: a.id }));
        reportSaveError(err);
      });
  },
});

persistence.startListening({
  matcher: isAnyOf(leads.saveLead, leads.setLeadStatus, leads.markContacted, leads.setFollowUp),
  effect: (action, api) => {
    const payload = (
      action as unknown as { payload: { placeId?: string; business?: { placeId: string } } }
    ).payload;
    const placeId = payload.placeId ?? payload.business?.placeId;
    if (!placeId) return;
    const before = (api.getOriginalState() as RootState).leads.byId[placeId];
    const after = (api.getState() as RootState).leads.byId[placeId];
    if (!after) return;
    const add = (...args: Parameters<typeof newActivity>) =>
      api.dispatch(activityAdded(newActivity(...args)));

    if (leads.saveLead.match(action) && !before) add(placeId, "saved");
    if (before && before.status !== after.status) {
      add(placeId, "status_changed", { from: before.status, to: after.status });
    }
    if (leads.markContacted.match(action)) {
      add(placeId, "message_sent", {
        channel: "whatsapp",
        templateId: action.payload.templateId,
        templateLabel: action.payload.templateLabel,
      });
    }
    if (before && before.nextFollowUpOn !== after.nextFollowUpOn) {
      add(placeId, "follow_up_set", {
        on: after.nextFollowUpOn,
        auto: leads.markContacted.match(action),
      });
    }
  },
});

/** Análise de site de um lead salvo também entra no histórico. */
persistence.startListening({
  actionCreator: runAnalysis.fulfilled,
  effect: ({ payload, meta }, api) => {
    if (!(api.getState() as RootState).leads.byId[meta.arg.id]) return;
    api.dispatch(
      activityAdded(
        newActivity(meta.arg.id, "analysis", { quality: payload.quality, isWeak: payload.isWeak }),
      ),
    );
  },
});

let settingsTimer: ReturnType<typeof setTimeout> | undefined;
persistence.startListening({
  matcher: isAnyOf(
    settings.setUserName,
    settings.setServiceId,
    settings.setThemePreference,
    settings.updateTemplate,
    settings.resetTemplate,
  ),
  effect: (action, api) => {
    clearTimeout(settingsTimer);
    // Tema salva na hora (a pessoa pode recarregar logo depois); texto espera parar de digitar.
    const delay = settings.setThemePreference.match(action) ? 0 : 700;
    settingsTimer = setTimeout(() => {
      getDataAdapter()
        ?.saveSettings((api.getState() as RootState).settings)
        .then(() => notify.success("Alterações salvas"))
        .catch(reportSaveError);
    }, delay);
  },
});

export const makeStore = (session?: SessionState) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: session ? { session } : undefined,
    middleware: (getDefault) =>
      getDefault()
        .prepend(persistence.middleware, feedback.middleware)
        .concat(findBusinessApi.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = AppState;
export type AppDispatch = AppStore["dispatch"];
