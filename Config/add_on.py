from typing import Union, Optional
import json
from os.path import dirname, realpath
from pathlib import Path

from aqt import mw, QDialog, QLayout, QKeySequence, qtmajor
from aqt.addons import AddonsDialog
from aqt.gui_hooks import addons_dialog_will_show

from .settings import Settings
from .config import jisho_trigger, wikipedia_trigger, lookup_language, backside

VERSION = "1.0.0"

class configDialogue:
    def __init__(self):
        self.addons_current: Optional[AddonsDialog] = None
        addons_dialog_will_show.append(self.save_addons_window)
        mw.addonManager.setConfigAction(__name__, self.show_settings)
        filepath = Path(dirname(realpath(__file__)), "wikis_list.json")
        with open(filepath, mode="r", encoding="utf-8") as file:
            self.langs = json.load(file)
            file.close()

    def set_settings(self, jisho_shortcut: str, wikipedia_shortcut: str, lang: str, front_or_back: bool) -> None:
        jisho_trigger.value = jisho_shortcut
        wikipedia_trigger.value = wikipedia_shortcut
        lookup_language.value = self.langs[lang]
        backside.value = front_or_back

    def save_addons_window(self, addons) -> None:
        self.addons_current = addons

    def show_settings(self) -> None:
        dialog = Settings(self.addons_current, self.set_settings)

        dialog.setupUi(
            jisho_trigger.value,
            wikipedia_trigger.value,
            VERSION,
            self.langs.keys(),
            list(self.langs.keys())[list(self.langs.values()).index(lookup_language.value)],
            backside.value,
        )
        return dialog.open()