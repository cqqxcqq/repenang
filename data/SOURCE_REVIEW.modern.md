# RePenang source review

Review date: **2026-11-09, Asia/Kuala_Lumpur**. Two entries were individually reviewed online. No calls, site visits, live opening-status checks or independent surveys were performed. `status: "verified"` means the published record and destination evidence were checked, and the UI describes this as **Sources checked online**. It does not mean government certification or assured present-day acceptance.

## Sources and field decisions

The [operator's station directory](https://www.riiicycle.com/recycling-stations) supplies each selected name, street address, contact number and destination link. The [operator's weekly schedule](https://www.riiicycle.com/station-schedule) is used for collection sessions. The [Penang Green Council's 2026 EcoChamps page](https://www.pgc.com.my/en/penang-green-citizens/i-am-ecochamps-penang-recycling-competition/) lists both Midlands and Auto City under the programme's collection stations, with accepted paper, metal, e-waste and plastic bottles/containers. Its restrictions are carried into the visible record notes. These are programme-specific categories, not a claim that every item in each category will be accepted.

| Record | Destination evidence | Schedule decision |
| --- | --- | --- |
| `riiicycle-midlands` | The [operator-linked Google destination](https://maps.app.goo.gl/r2R29rbcn25HBV5v7) resolves to a directions URL whose destination fields are `!1d100.306377!2d5.433082`. The operator's Waze link independently specifies `ll=5.43308200,100.30637700`. The wide `@` viewport centre in the Google URL was **not** used as the destination. | Operator lists Friday and Saturday, 15:00–17:00. Other days closed. |
| `riiicycle-auto-city` | The [operator-linked map pin](https://goo.gl/maps/PwoGhBeCsFaafA8P8) resolves to `!3d5.3375278!4d100.4266667`, corresponding to the published Auto City station card. | Operator lists Sunday, 09:00–12:00. Other days closed. |

The district labels Timur Laut and Seberang Perai Tengah describe George Town and Bukit Tengah respectively; they do not indicate a collection-service coverage area. The shared telephone is published on the selected station cards. Times are Malaysian local time. There is no “open now” calculation. Operator notices can override weekly schedules; visitors are asked to confirm before travelling.

## Candidates excluded from this initial directory

Straits Quay and Setia SPICE are published stations, but their current Google links point to the larger mall/convention venue rather than clearly identifying a collection point. Older [PGC directory entries](https://pgc.com.my/mampan_directory/zero_waste_network_list.php) provide coordinates and schedules, but the schedules conflict with the operator's current page. Their old pins were not promoted to reviewed destinations. MPKK Paya Terubong has a published street address and schedule but no map destination link on the reviewed operator card. They remain research candidates, not map entries with guessed coordinates.

MPKK Pantai Molek and Balik Pulau are marked closed until further notice; Udini Square is marked relocated on the operator page. Those entries were not added. An operator holiday closure notice for 8 November was also observed; no assumption of real-time operation is made on the review date.

The [DOE collection list](https://ewaste.doe.gov.my/index.php/about/list-of-collectors/) could not be retrieved during this review, so it is not claimed as verification for these records. The historic New World Park venue article gives hours different from the current operator schedule; it was not used to set any record's hours.

## Repeatable update procedure

Choose one candidate and open its operator or official source manually. Check that it is a public collection point, not a private processing plant or an expired event. Check accepted item types and exclusions, access restrictions, address, current schedule and any closure notice. Leave undocumented optional fields empty.

Open the map link published by that source. Read the actual destination coordinates, not the map's viewport centre, and check that it corresponds to the advertised collection site. If only a broad venue location is available, do not claim a precise collection point. Record the source URL in `coordinateSourceUrl`. Only then set `coordinatesVerified: true`, `verificationMethod: "published-sources"`, `status: "verified"` and the actual date of this source review in `verifiedAt`. A date is the review date, not the opening date or the source's publication date.

Update `locations.json`, this review log and the relevant source fields together. Run the checks in the README and inspect the marker, details and directions destination. If conflicting information cannot be resolved, use an unverified status and disable directions, or omit the entry pending clarification. Never infer precision from the number of decimal places. Do not automatically bulk-copy a third-party directory.

This is a deliberately small initial directory, not a comprehensive list of Penang collection points. Recheck before publication and periodically afterwards; there is no automatic freshness monitor.
