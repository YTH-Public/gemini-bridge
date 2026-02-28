# Gemini Bridge

Claude Code와 Antigravity IDE(Gemini)를 연결하는 브릿지. 파일 기반 트리거로 Claude에서 Gemini에게 메시지를 보내고, 응답을 자동 수집한다.

## 구조

```
gemini-bridge/
├── deploy.sh              # WSL + Windows 양쪽 배포 (환경 자동 감지)
├── src/
│   ├── bridge.py          # CLI 스크립트 (순수 Python3 stdlib)
│   ├── SKILL-wsl.md       # WSL Claude Code용 스킬
│   ├── SKILL-windows.md   # Windows Claude Code용 스킬
│   ├── GEMINI.md          # Gemini 글로벌 규칙
│   └── IMPROVEMENTS.md    # 개선 이력
└── extension/
    ├── extension.js       # Antigravity 익스텐션
    ├── package.json
    └── .vsixmanifest
```

## 동작 원리

```
Claude Code                    Antigravity IDE
    │                               │
    ├─ bridge.py send ──→ .trigger 파일 생성
    │                               │
    │                     Extension이 .trigger 감지
    │                               │
    │                     sendPromptToAgentPanel() ──→ Gemini 채팅
    │                               │
    │                     Gemini 응답 → from-gemini/*.md 저장
    │                               │
    ├─ bridge.py read ←── .md 파일 읽기
```

## 설치

### 1. 클론

```bash
git clone https://github.com/ms2116/gemini-bridge.git
cd gemini-bridge
```

### 2. 배포

```bash
bash deploy.sh
```

Windows(Git Bash)에서 실행하면 WSL + Windows 양쪽에 자동 배포된다.

### 배포 대상

| 소스 | WSL | Windows |
|------|-----|---------|
| `src/bridge.py` | `~/.claude/skills/gemini-bridge/bridge.py` | — |
| `src/SKILL-wsl.md` | `~/.claude/skills/gemini-bridge/SKILL.md` | — |
| `src/SKILL-windows.md` | — | `~/.claude/skills/gemini-bridge/SKILL.md` |
| `src/GEMINI.md` | `~/.gemini/GEMINI.md` | `~/.gemini/GEMINI.md` |
| `extension/*` | `~/.antigravity-server/extensions/yth1133.claude-bridge-0.1.0/` | `~/.antigravity/extensions/yth1133.claude-bridge-0.1.0-universal/` |

## 사용법

Claude Code에서:

```
/gemini init                    # 프로젝트에 bridge 구조 초기화
/gemini <메시지>                # Gemini에게 전송 (fire-and-forget)
/gemini ask <메시지>            # 전송 + 응답 대기 (자동 재시도 포함)
/gemini read                    # 최신 응답 읽기
/gemini list                    # 응답 목록
/gemini search <키워드>         # 검색
```

## 주요 기능

### 자동 재시도 (Auto-Continue)

Gemini가 에러로 멈추면 자동으로 "continue"를 보내 복구한다.

- **Extension 레이어**: `from-gemini/`에 3분간 새 파일이 없으면 → `sendPromptToAgentPanel('continue')` 전송, 최대 3회
- **bridge.py `ask` 모드**: 동일 로직을 CLI에서 수행 (`--timeout 180 --retries 3`)

### 자동 디렉토리 감지

`/gemini init` 후 Antigravity 재시작 없이 `bridge/from-claude/` 생성을 자동 감지하여 트리거 감시를 시작한다.

### 자동 권한 승인

트리거 전송 후 Gemini의 파일 접근 권한 요청을 자동으로 승인한다 (최대 10분).

### 태스크 카테고리 자동 라우팅

Claude가 메시지 내용을 분석하여 `[TASK: <category>]` 헤더를 자동 부여:

| 카테고리 | 용도 |
|---------|------|
| `design-review` | UI/UX 피드백 |
| `design-create` | 목업, 스타일링 |
| `web-research` | 웹 조사 |
| `image-generate` | 이미지 생성 |
| `verify-check` | 접근성, SEO 체크 |
| `general` | 일반 요청 |

## 업그레이드

```bash
cd gemini-bridge
# 파일 수정
bash deploy.sh
# 끝
```

## 요구사항

- Claude Code (WSL 또는 Windows)
- Antigravity IDE (Gemini 에이전트 활성)
- Python 3 (WSL)
- Git Bash (Windows)
