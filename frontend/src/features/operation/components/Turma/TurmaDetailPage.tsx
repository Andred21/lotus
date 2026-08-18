import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppTabView,
  AppTabPanel,
  AppTag,
  DetailHeader,
  IdentityCell,
  AppCard,
  AppDetailSkeleton,
  AppErrorState,
  AppButton,
} from "@shared/ui";
import { useTurmaDetail } from "../../hooks/useTurmaDetail";
import {
  turmaDisplayStatus,
  turmaStatusSeverity,
  turmaModalidadeTagProps,
} from "../../lib/turmaStatus";
import { TurmaConfigCard } from "./TurmaConfigCard";
import { RedatorDesignation } from "./RedatorDesignation";
import { EnrollmentSection } from "../Enrollment/EnrollmentSection";
import { TurmaDocuments } from "../Document/TurmaDocuments";
import { ConcludePanel } from "../Document/ConcludePanel";
import { screenDetail } from '@shared/lib'

export function TurmaDetailPage() {
  const { t } = useTranslation();
  const d = useTurmaDetail();
  const [tab, setTab] = useState(0);
  const [editingConfig, setEditingConfig] = useState(false);

  // Erro e notFound mantêm o `back`: sem ele um GET que falha e continua falhando
  // prende o usuário na rota — Reintentar recarrega, não sai.
  const back = { label: t("operation.detail.back"), onClick: d.goBack };

  // Todo ramo titula o seu estado: o `h1` da tela de detalhe mora no
  // `DetailHeader`, então ramo sem título é página sem nível 1 (Q-5).
  if (d.loading)
    return (
      <div>
        {/* Título escondido: a primeira barra do esqueleto JÁ é o lugar do
         * título — um h1 visível aqui seriam dois. O `back` acompanha para o
         * cabeçalho não pular de lugar quando o conteúdo chega, e para uma
         * carga que não termina não prender o usuário na rota. */}
        <DetailHeader back={back} title={t("common.loading")} titleHidden />
        <AppDetailSkeleton />
      </div>
    );
  if (d.loadError)
    return (
      <div>
        {/* Escondido pelo mesmo motivo: o `AppErrorState` já mostra esta frase
         * em destaque, e ele serve também às páginas de lista, onde o `h1` é do
         * `PageHeader` — promovê-la lá dentro daria dois níveis 1. */}
        <DetailHeader back={back} title={t("common.loadError")} titleHidden />
        <AppErrorState
          title={t("common.loadError")}
          detail={screenDetail(d.loadError) ?? t("common.loadErrorHint")}
          retryLabel={t("common.retry")}
          onRetry={d.reload}
        />
      </div>
    );
  if (!d.turma)
    return (
      <div>
        {/* Aqui a mensagem do estado É o título: virou `h1` e o `<p>` que
         * repetia a mesma frase saiu. */}
        <DetailHeader back={back} title={t("operation.detail.notFound")} />
      </div>
    );

  const turma = d.turma;
  const status = turmaDisplayStatus(turma);

  return (
    <div>
      <DetailHeader
        back={back}
        title={turma.course_name ?? "—"}
        subtitle={
          <IdentityCell
            inline
            title={turma.client_name ?? "—"}
            image={turma.client_photo_url}
            size="normal"
            description={
              turma.budget_id != null && (
                <AppButton
                  text
                  className="underline hover:no-underline"
                  onClick={() => d.goToBudget(turma.budget_id!)}
                >
                  {t("operation.detail.relatedTo", {
                    budget: turma.budget_code ?? "—",
                    quote: turma.quote_code ?? "—",
                  })}
                </AppButton>
              )
            }
          />
        }
        tags={
          <>
            <AppTag
              value={t(`operation.status.${status}`)}
              severity={turmaStatusSeverity(status)}
            />
            <AppTag
              value={t(`operation.modality.${turma.modalidade}`)}
              {...turmaModalidadeTagProps(turma.modalidade)}
            />
          </>
        }
      />

      <AppCard>
        <AppTabView activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
          <AppTabPanel header={t("operation.detail.tabs.config")}>
            <TurmaConfigCard
              mode={editingConfig ? "edit" : "view"}
              turma={turma}
              onEdit={() => setEditingConfig(true)}
              onCancel={() => setEditingConfig(false)}
              onSaved={() => setEditingConfig(false)}
            />
          </AppTabPanel>
          <AppTabPanel header={t("operation.detail.tabs.students")}>
            <EnrollmentSection turma={turma} />
          </AppTabPanel>
          <AppTabPanel header={t("operation.detail.tabs.redator")}>
            <RedatorDesignation turma={turma} />
          </AppTabPanel>
          <AppTabPanel header={t("operation.detail.tabs.docs")}>
            <TurmaDocuments turma={turma} />
          </AppTabPanel>
          <AppTabPanel header={t("operation.detail.tabs.conclusion")}>
            <ConcludePanel turma={turma} />
          </AppTabPanel>
        </AppTabView>
      </AppCard>
    </div>
  );
}
