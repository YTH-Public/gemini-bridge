# Gemini Bridge 개선사항

## 미해결 이슈

### 1. Antigravity 에러 시 자동 재시도 없음
- **발견일**: 2026-02-24
- **증상**: Gemini에게 메시지 전송 후 Antigravity 측에서 에러 발생 → 응답 생성 중단
- **임시 해결**: 사용자가 수동으로 "continue" 메시지를 보내면 이어서 처리됨
- **개선 방안**:
  - bridge.py의 `ask` 모드에 재시도 로직 추가 (timeout 시 자동 "continue" 전송)
  - 또는 Antigravity 규칙(.agent/rules/)에 에러 발생 시 자동 재시도 지시 추가
- **우선순위**: Medium (현재 수동 대응 가능)
