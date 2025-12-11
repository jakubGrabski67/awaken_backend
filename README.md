
---

## 📁 `awaken_backend/README.md`

```md
# Awaken Backend — IDML Translator (MVP)

## 🎯 Cel
Prototyp (MVP) backendu, który automatyzuje tłumaczenie plików Adobe InDesign (`.idml`) przy zachowaniu struktury XML.  
Umożliwia:
- upload pliku `.idml` lub `.zip` z wieloma plikami IDML,
- parsowanie i ekstrakcję tekstów (`<Content>` z `Stories/Story_*.xml`),
- translację (mock),
- generowanie nowego `.idml` z podmienionym tekstem.

---

## 🧭 Scenariusz użytkownika
1. **Upload** — `POST /api/files/upload`  
   Przyjmuje `.idml` lub `.zip`; zwraca `fileId`, nazwę i listę segmentów.
2. **Parsing & View** — backend rozpakowuje IDML (ZIP), czyta `designmap.xml` i `Stories/`.
3. **Action** — użytkownik tłumaczy pojedyncze lub wszystkie segmenty.
4. **Translate (Mock)** — `/api/translate/batch` generuje przykładowe tłumaczenia.
5. **Export** — `POST /api/files/:fileId/export` zwraca gotowy `.idml`.

---

## ⚙️ Architektura i technologia
- **Express + TypeScript**
- **adm-zip** — obsługa IDML (ZIP)
- **fast-xml-parser** — odczyt i zapis `<Content>`
- **multer** — upload plików
- **UUID + pamięć RAM (mock storage)** — sesyjne przechowywanie
- **CORS + dotenv** — integracja z frontendem Next.js

---

## ✅ Spełnione wymagania
- REST API (`upload`, `segments`, `translate`, `export`)
- Walidacja struktury IDML (designmap.xml + Stories)
- Obsługa `.zip` z wieloma `.idml`
- Obsługa błędów (422 / 415 / 500)
- AI Mock tłumaczeń: opóźnienie i tekst `[...] [Translated]`
- Pełna obsługa TypeScript (strict)
- Modularna struktura: `/controllers`, `/services`, `/routes`, `/utils`

---

## 🧩 Kluczowe endpointy
| Endpoint | Metoda | Opis |
|-----------|--------|------|
| `/api/files/upload` | `POST` | Upload `.idml` lub `.zip` |
| `/api/files/:fileId/segments` | `GET` | Lista segmentów |
| `/api/translate/batch` | `POST` | Mock tłumaczenia |
| `/api/files/:fileId/export` | `POST` | Eksport przetłumaczonego `.idml` |
| `/healthz` | `GET` | Test stanu serwera |

---

## 🧪 Uruchomienie
```bash
pnpm i
pnpm dev
# http://localhost:4000/healthz -> {"ok":true}
