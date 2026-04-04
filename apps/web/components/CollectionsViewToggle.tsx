import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CollectionsLayout } from "@/hooks/useCollectionsLayout";
import { useTranslation } from "next-i18next";

type Props = {
  layout: CollectionsLayout;
  setLayout: (layout: CollectionsLayout) => void;
};

export default function CollectionsViewToggle({ layout, setLayout }: Props) {
  const { t } = useTranslation();

  return (
    <TooltipProvider>
      <div
        className="inline-flex rounded-md border border-base-300 dark:border-neutral-600 p-0.5 gap-0.5 bg-base-100/80"
        role="group"
        aria-label={t("collections")}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={layout === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setLayout("list")}
              aria-pressed={layout === "list"}
              aria-label={t("collections_layout_list")}
            >
              <i className="bi-view-stacked text-neutral text-lg" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{t("collections_layout_list")}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={layout === "card" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setLayout("card")}
              aria-pressed={layout === "card"}
              aria-label={t("collections_layout_grid")}
            >
              <i className="bi-grid text-neutral text-lg" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{t("collections_layout_grid")}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
