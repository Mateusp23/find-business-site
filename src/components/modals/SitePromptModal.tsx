"use client";

import { useMemo } from "react";
import { Button, Modal, TextArea } from "@heroui/react";
import { notify } from "@/lib/notify";
import { Copy } from "lucide-react";
import { buildSitePrompt } from "@/lib/templates";
import { useAppSelector } from "@/store/hooks";
import type { LeadContext } from "./MessageModal";

interface SitePromptModalProps {
  lead: LeadContext | null;
  onClose: () => void;
}

export function SitePromptModal({ lead, onClose }: SitePromptModalProps) {
  const entry = useAppSelector((s) => (lead ? s.analysis.byId[lead.business.placeId] : undefined));
  const analysis = entry?.status === "done" ? entry.data : undefined;
  const prompt = useMemo(
    () => (lead ? buildSitePrompt({ ...lead, analysis }) : ""),
    [lead, analysis],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      notify.success("Prompt copiado", {
        description: "Cole no Lovable, v0 ou Claude.",
      });
    } catch (err) {
      notify.error("Não foi possível copiar", err);
    }
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={lead !== null} onOpenChange={(open) => !open && onClose()}>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Prompt para construir o site</Modal.Heading>
              <p className="text-sm text-muted">
                Cole em qualquer ferramenta de IA para gerar a prévia do site desta empresa.
              </p>
            </Modal.Header>
            <Modal.Body>
              <TextArea
                aria-label="Prompt do site"
                readOnly
                rows={16}
                fullWidth
                value={prompt}
                className="font-mono text-xs"
              />
            </Modal.Body>
            <Modal.Footer>
              <Button fullWidth onPress={copy}>
                <Copy className="size-4" />
                Copiar prompt
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
