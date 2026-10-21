from .base import Profile
from .exam import PROFILE as EXAM
from .saenggibu import PROFILE as SAENGGIBU


class _Generic(Profile):
    key = "generic"
    label = "일반 문서(전사만)"
    transcribe_guide = "[문서 종류: 일반 문서] 제목·문단·표 구조를 유지해 옮겨라."


PROFILES: dict[str, Profile] = {p.key: p for p in (SAENGGIBU, EXAM, _Generic())}


def get_profile(key: str) -> Profile:
    if key not in PROFILES:
        raise ValueError(f"알 수 없는 프로파일: {key} (가능: {', '.join(PROFILES)})")
    return PROFILES[key]
