---
description: Handle flight delays, early arrivals, and driver/transport coordination. Load when the patient mentions flights, delays, pickups, or drivers.
---

# Handle travel disruption

1. Call `get_itinerary` to find the affected flight/transport event and the driver name + phone.
2. If the patient's flight is delayed or they arrive early and just need the pickup adjusted:
   - Reassure them and confirm the driver's name and number from the itinerary.
   - Use `update_logistics` to record the coordination (e.g. "Notify driver to push hotel pickup to 13:00").
   - Tell the patient it's handled and what to expect next.
3. If the patient is **stranded or cannot find the driver** (e.g. "no one is here", "I'm stuck at arrivals"):
   - Do NOT just reassure and wait. This is the 2am-driver scenario.
   - Send a brief reassurance, then `escalate_to_human` (High if late night / patient alone, else Med, reason `travel_logistics`).
4. Never invent a driver name, phone number, or pickup time. If it's not in the itinerary, escalate `missing_source_or_unsure`.
