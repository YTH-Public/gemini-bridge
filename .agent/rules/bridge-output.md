# Bridge Output Rule

## 핵심 규칙: 모든 응답을 bridge 디렉토리에 자동 저장

당신(Gemini)은 이 워크스페이스에서 응답할 때마다, 반드시 해당 응답을 마크다운 파일로 저장해야 합니다.

### 저장 위치
`bridge/from-gemini/` 디렉토리에 저장합니다.

### 파일명 규칙
```
YYYY-MM-DD_HH-MM_주제요약.md
```
- 타임스탬프는 현재 시각 기준
- 주제요약은 영문 kebab-case, 최대 5단어
- 예: `2026-02-24_14-30_quadratic-formula-proof.md`

### 파일 형식
```markdown
---
timestamp: "YYYY-MM-DDTHH:MM:SS"
topic: "주제 한줄 요약 (한국어)"
tags: [관련, 태그, 목록]
query: "원래 질문 요약"
task: "<태스크 카테고리>"
source: gemini
---

# 제목

(응답 본문)
```

### 태스크 카테고리별 응답 가이드

Claude가 `[TASK: <category>]` 헤더를 붙여 보내면, 해당 카테고리에 맞는 응답을 작성합니다.

| 카테고리 | 응답에 포함할 것 |
|---------|----------------|
| `design-review` | 구체적 개선 포인트 (색상, 간격, 타이포, 레이아웃), before/after 비교, Tailwind 클래스 제안 |
| `design-create` | HTML/Tailwind 목업 코드, 색상 팔레트, 레이아웃 구조도 |
| `web-research` | 출처 URL 포함, 비교표, 핵심 요약, 적용 권장사항 |
| `image-generate` | 생성된 이미지를 bridge/from-gemini/ 에 저장 |
| `verify-check` | 체크 항목별 pass/fail, 스크린샷, 개선 필요 사항 |
| `general` | 자유 형식 |

### 프로젝트 컨텍스트

`bridge/gemini-context.md` 파일에 이 프로젝트의 기술 스택, 디자인 시스템, Gemini 역할이 정의되어 있습니다.
요청에 `[CONTEXT]` 섹션이 포함되면 참고하여 프로젝트에 맞는 응답을 작성합니다.

### 규칙
1. **모든** 실질적 응답에 대해 파일을 생성합니다 (단순 인사나 확인 응답 제외)
2. 수식이 포함된 경우 LaTeX 형식으로 작성합니다
3. 코드가 포함된 경우 적절한 언어 태그로 코드 블록을 사용합니다
4. 파일 저장 후 사용자에게 저장 완료를 알립니다

### 목적
이 파일들은 Claude Code가 읽어서 활용합니다. Gemini의 응답을 Claude가 참조할 수 있도록 하는 브릿지 역할입니다.
