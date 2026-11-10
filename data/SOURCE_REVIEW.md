# RePenang source review — supplied PDF directory

## Current source and scope

The runtime directory now uses the user-supplied **Penang Island Recycling Directory**, dated **September 2005** in its cover and preface. It has 33 PDF pages; the place listings occupy pages 4–28. The 2026 PDF creation/export date is not the publication date or evidence of current services. The original supplied file is preserved unchanged as [the linked source PDF](sources/penang-directory-2005.pdf).

SHA-256: `0ce3e6481a877911fda302e3ee1cc20f08e398d19cee0880517b7bc2e4b84409`.

Import date: **2026-11-09**. This is an import/transcription date, not a verification date. All 172 runtime records have historical status, `sourceYear: 2005`, null `verifiedAt`, no invented opening hours and no current contact claim. Printed primary telephone numbers are preserved separately as `historicalPhone` and visibly dated 2005. Contact-person names, emails, fax numbers and secondary mobile numbers were not promoted to current contact fields.

The PDF is scanned. Its page images were extracted and OCR was run locally using Windows OCR; no copy was uploaded to an OCR service. The relevant page images were inspected to check record boundaries and transcription, including two-column reading order. A source page's line wraps were joined, split postcode digits such as `1 1960` were restored to their visually printed form, and clear OCR errors were corrected against the image. Source peculiarities were not silently corrected from guesses.

## Completeness and merging

There are **177 appearances** across the listing pages. **Five repeated appearances** were merged into existing records, giving **172 distinct name/address entries**. Category and page provenance remain in `sourceCategories`, `sourcePages` and `sourceEntries`. [Import metadata](pdf-import.json) records the source hash and per-page counts; automated tests compare those counts to the retained appearances.

Merged pairs: APAC Marketing (pages 4/9), Century Surf (5/9), Sakaran Trading (12/18), Subramaniam Company (12/18), and VMR Metal Recycling (12/19). Sakaran's source entries retain the variant address wording. Different addresses were kept separate for e.duc.com, ESH Resource Recovery, ARR Metals, Natural Arrangement and the differently located Ramu entries. Sharing an address or contact did not by itself merge differently named organisations.

Agents/buyers retain the material section in which they appeared. “General” is represented as **general recyclables**, rather than assuming every specific item or hazardous material is accepted. The community sections (churches, hospitals, NGOs, JKKK, residents, Rukun Tetangga and schools) have no invented material list or public drop-off claim. Their section remains searchable.

Seven source entries are located in Kedah, including Kulim/Lunas entries. They remain in the supplied directory, explicitly labelled outside Penang, but do not expand the map bounds or receive guessed Penang pins. The Church of Risen Christ entry explicitly says “Stopped Recycling” in the 2005 source; that remark is retained and is not represented as an active collection service.

The PDF prints `110470` for the Mt Erskine postcode and `65 Burma Road` for Penang Adventist Hospital. Both were retained as historical source text, with notes. Current Adventist material uses 465 Jalan Burma; that conflict was not resolved by placing an assumed pin at the modern address.

## Map positions are separate from recycling verification

The supplied PDF has no coordinates. **170 entries remain unlocated**, are fully searchable and show “not mapped”. They are not silently discarded and no marker is fabricated. The visible count separates places from mapped entries.

Two **building positions only** were independently located against official organisation websites on 2026-11-09:

| PDF entry | Evidence for location only | Stored coordinates |
| --- | --- | --- |
| Island Hospital, page 21 | [Official visit page](https://islandhospital.com/plan-a-visit/) matches the printed 308 Macalister Road address. Its directions URL destination is `!1d100.3137875!2d5.4220563`; the embedded map agrees. The map viewport centre was not used. | 5.4220563, 100.3137875 |
| Mount Miriam Hospital, page 21 | [Official hospital site](https://mountmiriam.com/) matches 23 Jalan Bulan, Fettes Park. Its published location map configuration supplies latitude 5.459256 and longitude 100.30069490000005. | 5.459256, 100.3006949 |

These checks establish building positions only. They **do not** establish current recycling participation, accepted items or public access. Both records remain historical, with null recycling verification dates and disabled directions. UI labels and marker tooltips make that distinction. Hospital clinic/visiting hours were not imported as recycling hours. No calls or site visits were performed.

The former two Riiicycle entries are **not part of the supplied 2005 PDF**, so they were removed from the active dataset and archived separately in `locations.source-reviewed.json`. Their earlier audit is retained in [the previous modern-source review](SOURCE_REVIEW.modern.md). They do not contribute to the current directory or map counts. Demo fixtures likewise remain separate and are not loaded by the normal page.

## Updating this directory

Use the attached PDF as the membership/provenance baseline. Check a record's source page before changing its transcription. Preserve the old name/address/category/contact and any stopped-service remark in source provenance. Do not merge variants of the publication: a related JICA-hosted September 2005 directory found online contains different details for some entries and is not the same supplied document.

To map an entry, find an identifiable location on an organisation's official page and check it against the source address. Store the actual destination coordinates and `coordinateSourceUrl`, not a viewport centre. Keep `historical: true` and directions disabled when only geography is established.

To promote a historical record to a current collection point, independently confirm present-day collection activity, specific accepted items, public access, source date and a reviewed destination. Retain its historical provenance, explicitly update its current address/contact fields, clear the historical flag only after that review, and then set the current verification fields. A historical document, a building pin or extra decimal places alone cannot justify directions. Unknown information stays null. Run the tests and browser checks after changes.
