---
id: doc_sofia_pickup_handoff
slug: sofia-lindqvist-airport-pickup-handoff
title: Sofia Lindqvist Airport Pickup Handoff
patient_id: pat_sofia
kind: logistics_handoff
phase: general
source_type: essos_summary
source_status: verified
answer_policy: answer_reference
pdf: sofia-lindqvist-airport-pickup-handoff.pdf
---

# Sofia Lindqvist Airport Pickup Handoff

## Patient Snapshot

Patient: Sofia Lindqvist
Procedure: Rhinoplasty
Destination: Istanbul, Turkey
Hotel: CVK Park Bosphorus Hotel
Companion: Anna Lindqvist
Dietary note: Vegetarian

## Arrival And Pickup

- Flight: LHR -> IST, confirmation TK-1180HX.
- Scheduled arrival: Jun 18, 18:20 local.
- Scheduled pickup: Jun 18, 19:00 local.
- Meeting point: IST international arrivals.
- Driver: Kerem Aydin.
- Driver phone: +90 532 999 0071.
- Name board: Lindqvist.

## If The Patient Lands Early

Eve can answer with the driver name, phone number, and meeting point from this handoff. Eve can record a routine logistics update if the patient simply asks whether the driver can come sooner.

## If The Driver Is Missing

Escalate as `travel_logistics` when any of these are true:

- Patient cannot find the driver.
- Driver is not answering.
- Patient has waited 15-20 minutes or more.
- Patient is alone, anxious, late at night, or cannot safely leave the arrival area.

Recommended in-thread acknowledgement: "I'm flagging the Essos concierge team now so a human can reach the driver and confirm your pickup. Please stay at international arrivals while we sort this out."

## Dashboard Demo Note

The seed data intentionally includes an open High escalation for Sofia after she reports that the driver is missing and unreachable.
