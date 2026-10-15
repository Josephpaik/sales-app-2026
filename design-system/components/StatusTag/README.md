Status tags label where a sales case, an approval cert or a tax invoice stands; the word is always shown, colour only backs it up.

Source: `StatusTag`, `CertTag`, `TaxTag` in `src/components/common.tsx`. They are antd `Tag` (PC) and antd-mobile `Tag fill="outline"` with `--border-radius: radius-6` (mobile). The preview renders the app's own code live (`window.SomansaSales.StatusTag`, `CertTag`, `TaxTag`).

**The consumer provides** a status code; the label and colour come from the tables, never from the screen:

| Sales status (`SALES_STATUS`) | phase | colour |
|---|---|---|
| SN02Z 포케스팅(대기) | 발굴 | default |
| SN03Z 영업중 · SN04Z 분기예측 | 진행 | processing (`brand`) |
| SN05Z 수주 | 수주 | success |
| SN07Z 구축대기 · SN09Z 검수중 · SN10Z 검수완료 | 이행 | warning |
| SN12M 완료(미수) | 종결 | orange |
| SN12Z 완료(수금) | 종결 | success |
| SN13Z 이전영업 | 종결 | default |
| SN14Z 실주 | 종결 | error (`danger`) |

- Cert (서티): 승인대기 gold/warning · 승인완료 green/success · 반려 red/danger.
- Tax invoice: TBOK 완료 green · NONE 미발행 default · TBSTP 미수 red · others (요청, 대기, Pending, 재요청) gold.
- On mobile, map antd colours to antd-mobile: success→success, error→danger, warning/orange→warning, processing→primary, else default.
- Set `marginInlineEnd: 0` on PC tags so rows of tags align with `tag-row` gaps.
- Don't invent new statuses or recolour one per screen; add a code to the table instead.
