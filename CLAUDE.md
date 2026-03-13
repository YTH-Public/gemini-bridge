# Agent Bridge

Claude Code와 Antigravity IDE(Gemini + Codex)를 연결하는 파일 기반 브릿지.

## 프로젝트 구조

```
agent-bridge/
├── deploy.sh                  # 배포 (WSL + Windows 자동 감지)
├── src/
│   ├── bridge.py              # CLI (순수 Python3 stdlib, WSL에서 실행)
│   ├── SKILL-wsl.md           # WSL Claude Code용 Gemini 스킬
│   ├── SKILL-windows.md       # Windows Claude Code용 Gemini 스킬
│   ├── SKILL-codex-wsl.md     # WSL Claude Code용 Codex 스킬
│   ├── SKILL-codex-windows.md # Windows Claude Code용 Codex 스킬
│   ├── GEMINI.md              # Gemini 글로벌 규칙
│   └── IMPROVEMENTS.md        # 개선 이력 + Sprint Backlog
└── extension/
    ├── extension.js           # Antigravity 익스텐션 (Gemini + Codex)
    ├── package.json           # extensionKind: ["workspace"] (WSL Remote 지원)
    └── .vsixmanifest
```

## 핵심 개념

### bridge.py 커맨드
- `init` — bridge/ 디렉토리 + `.agent/rules/` 규칙 파일 생성
- `send` — 트리거 파일 생성 (논블로킹, fire-and-forget)
- `ask` — 트리거 생성 + 응답 대기 (블로킹)
- `status` — Gemini/Codex 양쪽 응답 상태 확인 (병렬 전송 후 사용)
- `latest` / `list` / `search` — 응답 읽기

### 규칙 파일 (init이 생성)
- `.agent/rules/bridge-output.md` — Gemini 전용 (Codex가 착각하지 않도록 분리)
- `.agent/rules/codex-output.md` — Codex 전용

### 병렬 전송
Gemini + Codex 동시 전송 시 `ask` 대신 `send` 사용 → `status`로 양쪽 응답 확인

## 개발 규칙

### 배포
- 파일 수정 후 반드시 `bash deploy.sh` 실행하여 양쪽(WSL + Windows) 동기화
- deploy.sh는 Git Bash(Windows)와 WSL 양쪽에서 실행 가능
- extensions.json 업데이트는 Python(`json` 모듈)으로 처리 (sed 사용 금지 — JSON 손상 방지)

### 코드 스타일
- bridge.py: 순수 Python3 stdlib만 사용 (pip/uv 의존성 금지)
- extension.js: Antigravity(VS Code 호환) 익스텐션 API 사용
- 사용자명/경로 하드코딩 금지 — `~`, `$HOME`, `wsl whoami` 등으로 동적 해결

### WSL 관련
- Git Bash에서 WSL 호출 시 반드시 `MSYS_NO_PATHCONV=1` 접두사 사용
- `~` 경로 확장이 필요하면 `wsl -e bash -c '...'` 패턴 사용
- Windows 경로 → WSL 변환: `D:\x` → `/mnt/d/x`
- WSL Remote 지원: `extensionKind: ["workspace"]`로 익스텐션이 WSL 쪽에서 실행됨

### Git
- 브랜치: main
- 커밋 메시지: 한국어, 간결하게

### 문서
- README.md: 합니다 존댓말 톤
- IMPROVEMENTS.md: 해결된 이슈 / 미해결 Sprint Backlog 구분 유지
- SKILL-wsl.md와 SKILL-windows.md: 동일 기능이지만 실행 경로가 다름 — 기능 변경 시 양쪽 모두 수정
- SKILL-codex-wsl.md와 SKILL-codex-windows.md: Codex 스킬도 동일 — 기능 변경 시 양쪽 모두 수정
- SKILL description에 한글 별칭 포함 (제미나이/코덱스/챗지피티)

## 테스트

변경 후 확인 사항:
1. `bash deploy.sh` 성공
2. Windows에서 `/gemini 테스트` → .trigger 파일 생성 확인
3. Windows에서 `/codex 테스트` → .codex-trigger 파일 생성 확인
4. Antigravity에서 trigger 감지 → Gemini/Codex 채팅 전달 확인
5. WSL Remote에서 Claude Bridge 상태바 표시 확인
6. `python3 bridge.py --dir /tmp/test init` → bridge-output.md + codex-output.md 생성 확인
