import { useTranslation } from "react-i18next";
import {
  AppTag,
  AppDataTable,
  AppColumn,
  AppSkeleton,
  AppErrorState,
  InlineLoadState,
  FormSection,
} from "@shared/ui";
import type { StudentTurmaData } from "@shared/types/generated";
import { LARGURA_TURMA_DO_ALUNO } from "./studentColumns";
import {
  enrollmentStatusLabelKey,
  enrollmentStatusSeverity,
  formatMonthYear,
  loadMessage,
} from "@shared/lib";
import { useResourceState } from "@shared/hooks";
import type { useStudentDetail } from "../../api/useStudentDetail";
import { StudentLinkRow } from "./StudentLinkRow";

/** As duas seções do modo view: histórico de vínculos e turmas do aluno. O
 * hook fica no diálogo — descê-lo cancelaria a requisição que hoje sai em modo
 * edit, e isso é mudança de rede, não extração (D4). */
export function StudentDetailSections({
  detail,
}: {
  detail: ReturnType<typeof useStudentDetail>;
}) {
  const { t } = useTranslation();
  /* Deriva pelo hook compartilhado, não à mão: a política de carga de recurso
     mora nele (rule `frontend-fsliced.md`). A query segue no diálogo — descê-la
     cancelaria a requisição que hoje sai em modo edit. */
  const estado = useResourceState(detail);

  /* A falha SUBSTITUI as duas seções só quando não há nada em cache. Com o
     detalhe em mão, um refetch falho mantém `data` populado enquanto `status`
     vira `error`: gatear por `isError` cru apagava vínculos e turmas já
     carregados (Q-1 do review do BD-18, precedente `CourseStep.tsx:46`).

     E quando substitui, cobre as DUAS. Mostrar o AppErrorState nos vínculos e
     deixar "Historial de turmas" com o cabeçalho e nada abaixo faz a falha de
     rede se parecer com "este aluno não tem turma" — vazio silencioso proibido
     (D16), e aqui o dado tem peso legal. */
  if (estado.failedWithoutData) {
    return (
      <AppErrorState
        title={t("common.loadError")}
        detail={loadMessage(estado, t)}
        retryLabel={t("common.retry")}
        onRetry={estado.refetch}
      />
    );
  }

  return (
    <>
      {/* Um aviso só, ACIMA das duas seções: é a MESMA requisição que alimenta
          as duas, e repeti-lo faria a tela contar duas vezes o que aconteceu
          uma. */}
      <InlineLoadState
        error={estado.isError ? loadMessage(estado, t) : null}
        retryLabel={t("common.retry")}
        onRetry={estado.refetch}
      />

      <FormSection title={t("student.sectionLinks")} spaced />

      {estado.isLoading && <AppSkeleton height="4rem" />}
      {estado.data &&
        (estado.data.links.length === 0 ? (
          <p
            className="text-sm"
            style={{ color: "var(--text-color-secondary)" }}
          >
            {t("student.noLinks")}
          </p>
        ) : (
          <ul className="space-y-2">
            {estado.data.links.map((link) => (
              <StudentLinkRow key={link.id} link={link} />
            ))}
          </ul>
        ))}

      <FormSection title={t("student.sectionTurmas")} spaced />
      {estado.isLoading && <AppSkeleton height="6rem" />}
      {estado.data && (
        <AppDataTable
          value={estado.data.turmas}
          emptyMessage={t("student.noTurmas")}
        >
          <AppColumn
            header={t("student.turmaCode")}
            style={LARGURA_TURMA_DO_ALUNO.code}
            body={(turma: StudentTurmaData) => (
              <span
                className="font-bold text-sm"
                style={{ color: "var(--primary-color)" }}
              >
                {turma.quote_code}
              </span>
            )}
          />
          <AppColumn
            header={t("student.turmaCourse")}
            style={LARGURA_TURMA_DO_ALUNO.course}
            body={(turma: StudentTurmaData) => turma.course_name}
          />
          <AppColumn
            header={t("student.turmaDate")}
            style={LARGURA_TURMA_DO_ALUNO.date}
            body={(turma: StudentTurmaData) =>
              formatMonthYear(turma.start_date)
            }
          />
          <AppColumn
            header={t("student.turmaStatus")}
            style={LARGURA_TURMA_DO_ALUNO.status}
            body={(turma: StudentTurmaData) => (
              <AppTag
                value={t(
                  enrollmentStatusLabelKey(turma.approval_status),
                )}
                severity={enrollmentStatusSeverity(
                  turma.approval_status,
                )}
              />
            )}
          />
        </AppDataTable>
      )}
    </>
  );
}
