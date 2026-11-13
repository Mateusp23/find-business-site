"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Modal } from "@heroui/react";
import { FormTextField, SubmitButton } from "@/components/form";
import { localDay } from "@/lib/sales";
import { saleSchema, type SaleInput, type SaleValues } from "@/lib/validation/schemas";
import { saveSale } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import type { SavedLead } from "@/types/lead";

export function SaleModal({ lead, onClose }: { lead: SavedLead | null; onClose: () => void }) {
  return (
    <Modal>
      <Modal.Backdrop isOpen={Boolean(lead)} onOpenChange={(open) => !open && onClose()}>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog>
            {lead && <SaleForm key={lead.business.placeId} lead={lead} onClose={onClose} />}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

const reais = (value: number) => (value / 100).toFixed(2).replace(".", ",");
function SaleForm({ lead, onClose }: { lead: SavedLead; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { control, handleSubmit, formState } = useForm<SaleInput, unknown, SaleValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      amountCents: reais(lead.sale?.amountCents ?? 0),
      monthlyCents: reais(lead.sale?.monthlyCents ?? 0),
      closedOn: lead.sale?.closedOn ?? localDay(),
      recurringEndOn: lead.sale?.recurringEndOn ?? "",
    },
  });
  const onSubmit = handleSubmit(async (sale) => {
    try {
      await dispatch(saveSale({ placeId: lead.business.placeId, sale })).unwrap();
      onClose();
    } catch { /* O middleware apresenta o erro; mantém os dados para tentar novamente. */ }
  });
  const remove = async () => {
    setRemoving(true);
    try {
      await dispatch(saveSale({ placeId: lead.business.placeId, sale: null })).unwrap();
      onClose();
    } catch { setRemoving(false); }
  };
  const busy = formState.isSubmitting || removing;
  return (
    <>
      <Modal.CloseTrigger isDisabled={busy} />
      <Modal.Header>
        <Modal.Heading>{lead.sale ? "Editar venda" : "Fechar venda"}</Modal.Heading>
        <p className="text-sm text-muted">{lead.business.name}</p>
      </Modal.Header>
      <Modal.Body>
        <form id="sale-form" noValidate onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormTextField control={control} name="amountCents" label="Valor da venda (R$)" description="Valor pontual, sem a mensalidade." inputMode="decimal" isDisabled={busy} autoFocus isRequired />
            <FormTextField control={control} name="monthlyCents" label="Valor mensal (R$)" description="Use 0,00 se não houver recorrência." inputMode="decimal" isDisabled={busy} isRequired />
          </div>
          <FormTextField control={control} name="closedOn" label="Data de fechamento" type="date" isDisabled={busy} isRequired />
          <FormTextField control={control} name="recurringEndOn" label="Fim da recorrência (opcional)" type="date" description="Último dia do contrato. Em branco, a mensalidade continua ativa." isDisabled={busy} />
          <p className="rounded-xl bg-surface-secondary p-3 text-sm text-muted">
            A primeira mensalidade conta no fechamento. As próximas contam no mesmo dia de cada mês. Os valores são estimativas de contrato, sem controle de pagamentos recebidos.
          </p>
          <SubmitButton isSubmitting={formState.isSubmitting} isDisabled={removing}>
            {lead.sale ? "Salvar venda" : "Salvar e marcar como fechado"}
          </SubmitButton>
        </form>
        {lead.sale && (
          <div className="mt-5 border-t border-separator pt-4">
            {confirmRemove ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">Remover os valores desta venda da dashboard? A etapa do lead será mantida. Para encerrar só a mensalidade, preencha o fim da recorrência.</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="danger" onPress={remove} isDisabled={busy}>Remover venda</Button>
                  <Button variant="ghost" onPress={() => setConfirmRemove(false)} isDisabled={busy}>Manter venda</Button>
                </div>
              </div>
            ) : <Button variant="danger-soft" onPress={() => setConfirmRemove(true)} isDisabled={busy}>Remover registro de venda</Button>}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer><Button variant="ghost" onPress={onClose} isDisabled={busy}>Cancelar</Button></Modal.Footer>
    </>
  );
}
