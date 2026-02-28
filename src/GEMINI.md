# Gemini 글로벌 규칙

## Bridge 자동 저장

프로젝트에 `bridge/from-gemini/` 디렉토리가 존재하면, 모든 실질적 응답을 해당 디렉토리에 마크다운 파일로 자동 저장합니다.

- 파일명: `YYYY-MM-DD_HH-MM_주제요약.md` (주제요약은 영문 kebab-case)
- frontmatter 포함: timestamp, topic, tags, query
- 단순 인사/확인 응답은 저장하지 않음
- 저장 후 사용자에게 저장 완료를 알림

이 파일들은 Claude Code가 참조합니다. 자세한 형식은 워크스페이스의 `.agent/rules/bridge-output.md` 규칙을 따릅니다.
