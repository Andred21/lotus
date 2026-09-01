import { useTranslation } from "react-i18next";
import { AppTag } from "@shared/ui";
import type { StudentClientLogData } from "@shared/types/generated";
import { formatMonthYear } from "@shared/lib";

/** Uma linha do histórico de vínculos do aluno: cliente à esquerda, vigência à
 * direita. Saiu de dentro do `StudentDetailSections` quando ele passou da régua
 * de 150 linhas — movimento literal, nenhuma condicional mudou de forma. */
export function StudentLinkRow({ link }: { link: StudentClientLogData }) {
  const { t } = useTranslation();

  return (
    <li
      className="flex items-center justify-between rounded-surface border p-3 "
      style={{ borderColor: "var(--surface-border)" }}
    >
      <span className="text-sm font-medium ">{link.client_name}</span>
      <span
        className="flex items-center gap-3 text-xs"
        style={{ color: "var(--text-color-secondary)" }}
      >
        {link.ended_on === null && (
          <AppTag value={t("student.linkCurrent")} severity="info" />
        )}
        {link.ended_on === null
          ? t("student.linkSince", { date: formatMonthYear(link.started_on) })
          : t("student.linkRange", {
              from: formatMonthYear(link.started_on),
              to: formatMonthYear(link.ended_on),
            })}
      </span>
    </li>
  );
}
