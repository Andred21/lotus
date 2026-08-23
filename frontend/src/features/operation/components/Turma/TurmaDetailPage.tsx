import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppTabView,
  AppTabPanel,
  DetailHeader,
  AppCard,
  AppDetailSkeleton,
  AppErrorState,
} from "@shared/ui";
import { useTurmaDetail } from "../../hooks/useTurmaDetail";
import { registroAcademicoBloqueado } from "../../lib/turmaStatus";
import { TurmaDetailHeader } from "./TurmaDetailHeader";
import { TurmaConfigCard } from "./TurmaConfigCard";
import { RedatorDesignation } from "./RedatorDesignation";
import { EnrollmentSection } from "../Enrollment/EnrollmentSection";
import { TurmaDocuments } from "../Document/TurmaDocuments";
import { ConcludePanel } from "../Document/ConcludePanel";
import { loadErrorHint, screenDetail } from '@shared/lib'

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
          detail={screenDetail(d.loadError) ?? t(loadErrorHint(d.loadError))}
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
  const bloqueado = registroAcademicoBloqueado(turma);

  return (
    <div>
      <TurmaDetailHeader back={back} turma={turma} onGoToBudget={d.goToBudget} />

      {/* Um cartão para a PÁGINA, não um por aba: o bloqueio vale para o
        * registro acadêmico inteiro (configuração, matrícula, resultado,
        * redator e documentação), e as abas que escondem os controles precisam
        * dizer por quê num lugar só — repetido em cada aba, o mesmo motivo
        * apareceria de novo a cada troca de painel. Fica ACIMA das abas porque
        * é o que explica os controles que sumiram lá dentro. */}
      {bloqueado && (
        <AppCard tone="info" className="mb-4 px-3 py-2 text-sm">
          {t("operation.detail.lock.concluida")}
        </AppCard>
      )}

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
