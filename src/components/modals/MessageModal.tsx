"use client";

import { useState } from "react";
import { Alert, Button, Modal, TextArea } from "@heroui/react";
import { notify } from "@/lib/notify";
import { Copy, MessageCircle } from "lucide-react";
import { serviceById } from "@/lib/catalog";
import { fillTemplate, whatsappUrl } from "@/lib/templates";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { markContacted, saveLead } from "@/store/slices/leadsSlice";
import type { Business } from "@/types/lead";

export interface LeadContext {
  business: Business;
  city: string;
  uf: string;
  niche: string;
}

interface MessageModalProps {
  lead: LeadContext | null;
  onClose: () => void;
}

export function MessageModal({ lead, onClose }: MessageModalProps) {
  return (
    <Modal>
      <Modal.Backdrop isOpen={lead !== null} onOpenChange={(open) => !open && onClose()}>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog>
            {lead && <MessageModalBody key={lead.business.placeId} lead={lead} onClose={onClose} />}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function MessageModalBody({ lead, onClose }: { lead: LeadContext; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const { userName, serviceId, templates } = useAppSelector((s) => s.settings);
  const b = lead.business;
  const entry = useAppSelector((s) => s.analysis.byId[b.placeId]);
  const analysis = entry?.status === "done" ? entry.data : undefined;
  // Site fraco já analisado: começa pelo modelo que usa o diagnóstico.
  const [templateId, setTemplateId] = useState(() =>
    analysis?.isWeak && templates.some((t) => t.id === "diagnostico")
      ? "diagnostico"
      : (templates[0]?.id ?? ""),
  );

  const render = (id: string) =>
    fillTemplate(templates.find((t) => t.id === id)?.body ?? "", {
      business: b,
      userName,
      servicePitch: serviceById(serviceId).pitch,
      city: lead.city,
      niche: lead.niche,
      analysis,
    });

  const [text, setText] = useState(() => render(templateId));

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    setText(render(id));
  };

  const openWhatsapp = () => {
    dispatch(saveLead(lead));
    const template = templates.find((t) => t.id === templateId);
    dispatch(markContacted({ placeId: b.placeId, templateId, templateLabel: template?.label }));
    window.open(whatsappUrl(b.phoneE164, text), "_blank", "noopener");
    onClose();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      notify.success("Mensagem copiada");
    } catch (err) {
      notify.error("Não foi possível copiar", err);
    }
  };

  return (
    <>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>Mensagem para {b.name}</Modal.Heading>
        <p className="text-sm text-muted">Escolha um modelo, ajuste o texto e abra no WhatsApp.</p>
      </Modal.Header>
      <Modal.Body className="gap-4">
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={t.id === templateId ? "primary" : "tertiary"}
              onPress={() => pickTemplate(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {!userName && (
          <Alert status="warning">
            <Alert.Content>
              <Alert.Description>
                Coloque seu nome em Perfil para ele aparecer nas mensagens.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}
        {b.phone && !b.isMobile && (
          <Alert status="warning">
            <Alert.Content>
              <Alert.Description>
                O telefone no Google é fixo: {b.phone}. Pode não ter WhatsApp: vale ligar ou
                procurar o celular no Instagram da empresa.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <TextArea
          aria-label="Texto da mensagem"
          rows={9}
          fullWidth
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="tertiary" onPress={copy}>
          <Copy className="size-4" />
          Copiar texto
        </Button>
        <Button onPress={openWhatsapp}>
          <MessageCircle className="size-4" />
          Abrir no WhatsApp
        </Button>
      </Modal.Footer>
    </>
  );
}
