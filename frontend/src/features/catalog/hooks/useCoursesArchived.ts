import { useTranslation } from "react-i18next";
import { useArchivedPage } from "@shared/hooks";
import { useToast } from "@shared/ui";
import { coursesApi } from "@shared/api/coursesApi";
import { problemMessage } from "@shared/api/problemMessage";
import type { ArchivedCourseData, CourseData } from "@shared/types/generated";

/** Mesma razão do `useCoursesPage`: mantém a query fora do componente. O
 * `useRemove` do arquivar entra aqui pelo mesmo motivo. Gêmeo do
 * `useClientsArchived`, toast incluído (Q-2 do review de 2026-08-18). */
export function useCoursesArchived() {
  const { t } = useTranslation();
  const toast = useToast();
  const page = useArchivedPage<CourseData, ArchivedCourseData>(
    coursesApi,
    (row) => row.course,
  );
  const archiveMutation = coursesApi.useRemove();

  const falhou = (problem: Parameters<typeof problemMessage>[0]) => {
    const message = problemMessage(problem);
    if (message) toast.error(message);
  };

  return {
    ...page,
    restore: (id: number) =>
      page.restore(id, {
        onSuccess: () => toast.success(t("archive.restoredToast")),
        onError: falhou,
      }),
    archive: (id: number, options?: { onSuccess?: () => void }) =>
      archiveMutation.mutate(id, {
        onSuccess: () => {
          toast.success(t("archive.archivedToast"));
          options?.onSuccess?.();
        },
        onError: falhou,
      }),
    archiving: archiveMutation.isPending,
  };
}
