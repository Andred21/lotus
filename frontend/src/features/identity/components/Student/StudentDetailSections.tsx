import { useTranslation } from "react-i18next";
import {
  AppTag,
  AppDataTable,
  AppColumn,
  AppSkeleton,
  AppErrorState,
  FormSection,
} from "@shared/ui";
import type {
  StudentTurmaData,
  StudentClientLogData,
} from "@shared/types/generated";
import {
  enrollmentStatusLabelKey,
  enrollmentStatusSeverity,
  formatMonthYear,
  loadErrorHint,
  screenDetail,
} from "@shared/lib";
import type { useStudentDetail } from "../../api/useStudentDetail";

/** As duas seções do modo view: histórico de vínculos e turmas do aluno. O
 * hook fica no diálogo — descê-lo cancelaria a requisição que hoje sai em modo
 * edit, e isso é mudança de rede, não extração (D4). */
export function StudentDetailSections({
  detail,
}: {
  detail: ReturnType<typeof useStudentDetail>;
}) {
  const { t } = useTranslation();

  return detail.isError ? (
    /* O erro cobre as DUAS seções, não só a primeira. Mostrar o
     AppErrorState nos vínculos e deixar "Historial de turmas" com o
     cabeçalho e nada abaixo faz a falha de rede se parecer com "este
     aluno não tem turma" — vazio silencioso proibido (D16), e aqui o
     dado tem peso legal. */
    <AppErrorState
      title={t("common.loadError")}
      detail={screenDetail(detail.error) ?? t(loadErrorHint(detail.error))}
      retryLabel={t("common.retry")}
      onRetry={detail.refetch}
    />
  ) : (
    <>
      <FormSection title={t("student.sectionLinks")} spaced />

      {detail.isLoading && <AppSkeleton height="4rem" />}
      {detail.data &&
        (detail.data.links.length === 0 ? (
          <p
            className="text-sm"
            style={{ color: "var(--text-color-secondary)" }}
          >
            {t("student.noLinks")}
          </p>
        ) : (
          <ul className="space-y-2">
            {detail.data.links.map((link: StudentClientLogData) => (
              <li
                key={link.id}
                className="flex items-center justify-between rounded border p-3 "
                style={{ borderColor: "var(--surface-border)" }}
              >
                <span className="text-sm font-medium ">
                  {link.client_name}
                </span>
                <span
                  className="flex items-center gap-3 text-xs"
                  style={{ color: "var(--text-color-secondary)" }}
                >
                  {link.ended_on === null && (
                    <AppTag
                      value={t("student.linkCurrent")}
                      severity="info"
                    />
                  )}
                  {link.ended_on === null
                    ? t("student.linkSince", {
                        date: formatMonthYear(link.started_on),
                      })
                    : t("student.linkRange", {
                        from: formatMonthYear(link.started_on),
                        to: formatMonthYear(link.ended_on),
                      })}
                </span>
              </li>
            ))}
          </ul>
        ))}

      <FormSection title={t("student.sectionTurmas")} spaced />
      {detail.isLoading && <AppSkeleton height="6rem" />}
      {detail.data && (
        <AppDataTable
          value={detail.data.turmas}
          emptyMessage={t("student.noTurmas")}
        >
          <AppColumn
            header={t("student.turmaCode")}
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
            body={(turma: StudentTurmaData) => turma.course_name}
          />
          <AppColumn
            header={t("student.turmaDate")}
            body={(turma: StudentTurmaData) =>
              formatMonthYear(turma.start_date)
            }
          />
          <AppColumn
            header={t("student.turmaStatus")}
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
