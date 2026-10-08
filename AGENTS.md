<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep homepage visual styling scoped to `.resort-home` and reusable reveal behavior in `src/components/home` so guest-site redesigns do not change staff panels.
- Homepage room names, rates and guest limits come from the existing rooms query; bundled concept photography is presentation only, never resort inventory data.
- Prebundle React, React DOM and Radix Slot together in Vite to prevent late dependency discovery from mixing React instances in an open preview.
- External OTA/channel reservations must go through a `ChannelAdapter` (src/lib/channels.ts) into `channel_reservations` and then `bookings`, so one availability check (rooms_free in bookings_compute) prevents overbooking across channels.
- Money rows (folio_charges, payments, expenses) of a day closed by night audit are locked by trigger; corrections are new rows on an open day.
- UI copy and money formatting should go through src/lib/i18n.ts (`t`, `money`) when touched, so languages/currencies can be added later.
- Operational and account screens use `.panel-page`, shared `PanelHeader`, and local table scroll containers so mobile layout changes stay isolated from the resort homepage.
