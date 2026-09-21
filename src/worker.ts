/**
 * Cloudflare Worker entry (see wrangler.jsonc `main`).
 *
 * Wraps the Astro request handler with EmDash's `scheduled()` handler so the
 * cron trigger can publish scheduled content. `PluginBridge` is re-exported
 * because EmDash expects its Durable Object class to resolve from the entry
 * module, even when the plugin sandbox is not enabled.
 */
import handler, {
  createScheduledHandler,
  PluginBridge,
} from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

export default {
  ...handler,
  scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
