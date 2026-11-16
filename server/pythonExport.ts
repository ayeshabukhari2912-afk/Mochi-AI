import type { PetProfile, PythonBundleFile } from '../src/types.ts';

export function buildPythonDesktopBundle(profile: PetProfile): PythonBundleFile[] {
  const profileJson = JSON.stringify(
    {
      name: profile.name,
      nickname: profile.nickname,
      owner_name: profile.ownerName,
      archetype: profile.archetype,
      primary_color: profile.primaryColor,
      secondary_color: profile.secondaryColor,
      eye_color: profile.eyeColor,
      eye_style: profile.eyeStyle,
      accessories: profile.accessories,
      aura_intensity: profile.auraIntensity,
      scale: profile.scale,
    },
    null,
    2,
  );

  return [
    {
      path: 'mochi_pet/requirements.txt',
      language: 'text',
      content: `PySide6>=6.7.0
ModernGL>=5.11.0
PyGLM>=2.7.0
google-genai>=1.0.0
edge-tts>=6.1.12
SpeechRecognition>=3.10.4
pydantic>=2.7.0
`,
    },
    {
      path: 'mochi_pet/src/core/config.py',
      language: 'python',
      content: `from dataclasses import dataclass, field
from pathlib import Path
import json

DEFAULT_PROFILE = ${profileJson.replace(/true/g, 'True').replace(/false/g, 'False')}

@dataclass
class AppConfig:
    db_path: Path = Path("mochi_memory.db")
    always_on_top: bool = True
    window_size: int = 340
    model_name: str = "gemini-2.5-flash"
    pet_profile: dict = field(default_factory=lambda: dict(DEFAULT_PROFILE))

    def save(self, path: Path = Path("mochi_config.json")) -> None:
        path.write_text(json.dumps(self.pet_profile, indent=2), encoding="utf-8")
`,
    },
    {
      path: 'mochi_pet/src/pet/profile.py',
      language: 'python',
      content: `from dataclasses import dataclass, field
from typing import List

@dataclass
class PetProfile:
    name: str = ${JSON.stringify(profile.name)}
    nickname: str = ${JSON.stringify(profile.nickname)}
    owner_name: str = ${JSON.stringify(profile.ownerName)}
    archetype: str = ${JSON.stringify(profile.archetype)}
    primary_color: str = ${JSON.stringify(profile.primaryColor)}
    secondary_color: str = ${JSON.stringify(profile.secondaryColor)}
    eye_color: str = ${JSON.stringify(profile.eyeColor)}
    eye_style: str = ${JSON.stringify(profile.eyeStyle)}
    accessories: List[str] = field(default_factory=lambda: ${JSON.stringify(profile.accessories)})
    aura_intensity: float = ${profile.auraIntensity}
    scale: float = ${profile.scale}
    mood: str = ${JSON.stringify(profile.mood)}
`,
    },
    {
      path: 'mochi_pet/src/ai/prompts.py',
      language: 'python',
      content: `from src.pet.profile import PetProfile

def build_system_prompt(pet: PetProfile, memories: list[str]) -> str:
    accessories = ", ".join(pet.accessories) if pet.accessories else "none"
    mem_block = "\\n".join(f"- {m}" for m in memories) or "- None yet."
    return f"""You are {pet.name} (nickname: {pet.nickname}), a 3D desktop companion for {pet.owner_name}.
Personality archetype: {pet.archetype}.
Appearance: primary color {pet.primary_color}, accent {pet.secondary_color}, {pet.eye_style} eyes ({pet.eye_color}), accessories: {accessories}.
Current mood: {pet.mood}.
Saved memories:
{mem_block}
Respond warmly in 1-2 short sentences suitable for a desktop speech bubble."""
`,
    },
    {
      path: 'mochi_pet/src/ai/memory.py',
      language: 'python',
      content: `import sqlite3
from datetime import datetime, timezone
from pathlib import Path

class MemoryStore:
    def __init__(self, db_path: Path = Path("mochi_memory.db")) -> None:
        self.conn = sqlite3.connect(db_path)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        self.conn.commit()

    def add_memory(self, content: str, category: str = "fact") -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.conn.execute(
            "INSERT INTO memories (category, content, created_at) VALUES (?, ?, ?)",
            (category, content, now),
        )
        self.conn.commit()

    def list_memories(self, limit: int = 20) -> list[str]:
        rows = self.conn.execute(
            "SELECT content FROM memories ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [r[0] for r in rows]
`,
    },
    {
      path: 'mochi_pet/src/ai/brain.py',
      language: 'python',
      content: `import os
from google import genai
from src.pet.profile import PetProfile
from src.ai.prompts import build_system_prompt

class CompanionBrain:
    def __init__(self) -> None:
        api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key) if api_key else None

    def reply(self, pet: PetProfile, memories: list[str], message: str) -> str:
        if not self.client:
            return f"Chirp! ({pet.name} is resting in offline mode.)"
        resp = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=message,
            config={"system_instruction": build_system_prompt(pet, memories)},
        )
        return resp.text or "..."
`,
    },
    {
      path: 'mochi_pet/src/renderer/window.py',
      language: 'python',
      content: `from PySide6.QtCore import Qt, QPoint
from PySide6.QtGui import QMouseEvent
from PySide6.QtOpenGLWidgets import QOpenGLWidget

class TransparentPetWindow(QOpenGLWidget):
    def __init__(self, size: int = 340) -> None:
        super().__init__()
        self.setWindowFlags(
            Qt.FramelessWindowHint
            | Qt.WindowStaysOnTopHint
            | Qt.Tool
        )
        self.setAttribute(Qt.WA_TranslucentBackground, True)
        self.resize(size, size)
        self._drag_offset: QPoint | None = None

    def mousePressEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.LeftButton:
            self._drag_offset = event.globalPosition().toPoint() - self.pos()

    def mouseMoveEvent(self, event: QMouseEvent) -> None:
        if self._drag_offset is not None and event.buttons() & Qt.LeftButton:
            self.move(event.globalPosition().toPoint() - self._drag_offset)

    def mouseReleaseEvent(self, event: QMouseEvent) -> None:
        self._drag_offset = None
`,
    },
    {
      path: 'mochi_pet/main.py',
      language: 'python',
      content: `import sys
from PySide6.QtWidgets import QApplication
from src.core.config import AppConfig
from src.renderer.window import TransparentPetWindow

def main() -> None:
    app = QApplication(sys.argv)
    config = AppConfig()
    window = TransparentPetWindow(size=config.window_size)
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
`,
    },
  ];
}
