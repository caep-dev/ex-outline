import { find } from "es-toolkit/compat";
import { useEffect, useMemo } from "react";
import { toError } from "@shared/utils/error";
import embeds, { EmbedDescriptor } from "@shared/editor/embeds";
import { IntegrationType, TeamPreference } from "@shared/types";
import type Integration from "~/models/Integration";
import Logger from "~/utils/Logger";
import useCurrentTeam from "./useCurrentTeam";
import useStores from "./useStores";

/**
 * Hook to get all embed configuration for the current team
 *
 * @param loadIfMissing Should we load integration settings if they are not locally available
 * @param publicReader Uses static descriptors without workspace settings or preferences
 * @returns A list of embed descriptors
 */
export default function useEmbeds(loadIfMissing = false, publicReader = false) {
  const { integrations } = useStores();
  const team = useCurrentTeam({ rejectOnEmpty: false });

  useEffect(() => {
    async function fetchEmbedIntegrations() {
      try {
        await integrations.fetchAll({
          type: IntegrationType.Embed,
        });
      } catch (err) {
        Logger.error("Failed to fetch embed integrations", toError(err));
      }
    }

    if (
      !publicReader &&
      !integrations.isLoaded &&
      !integrations.isFetching &&
      loadIfMissing
    ) {
      void fetchEmbedIntegrations();
    }
  }, [integrations, loadIfMissing, publicReader]);

  const disabledEmbeds =
    (team?.getPreference(TeamPreference.DisabledEmbeds) as string[]) || [];

  return useMemo(
    () =>
      embeds.map((e) => {
        const descriptor = new EmbedDescriptor(e);
        if (publicReader) {
          descriptor.disabled = false;
          return descriptor;
        }
        // Find any integrations that match this embed and inject the settings
        const integration: Integration<IntegrationType.Embed> | undefined =
          find(integrations.orderedData, (i) => i.service === e.name);

        descriptor.settings = integration?.settings;
        descriptor.disabled = disabledEmbeds.includes(e.id);
        return descriptor;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [integrations.orderedData, team?.preferences, publicReader]
  );
}
