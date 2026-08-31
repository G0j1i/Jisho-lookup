from aqt import mw
from typing import Any


class ProfileConfig:
    """
    Used for profile-specific settings.
    """

    def __init__(self, keyword: str, default: Any):
        self.keyword = keyword
        self.default = default

    @property
    def value(self) -> Any:
        return mw.pm.profile.get(self.keyword, self.default)

    @value.setter
    def value(self, new_value: Any):
        mw.pm.profile[self.keyword] = new_value

    def remove(self):
        try:
            del mw.pm.profile[self.keyword]
        except KeyError:
            # same behavior as Collection.remove_config
            pass


# shortcut in editor
jisho_trigger = ProfileConfig("jishoTrigger", "Ctrl+D")
wikipedia_trigger = ProfileConfig("wikipediaTrigger", "Ctrl+W")
lookup_language = ProfileConfig("lookupLanguage", "en")
backside = ProfileConfig("backside", True)
