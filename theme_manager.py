from aqt.gui_hooks import theme_did_change
from aqt.theme import theme_manager
from aqt import mw

def decide_theme():
    # if mw.pm.profile.get('night_mode'):
    darkmode = theme_manager.get_night_mode() #mw.col.conf.get('nightMode')
    if darkmode:
        mw.web.eval("set_dark_mode()")
    elif not darkmode:
        mw.web.eval("set_light_mode()")
    return darkmode

def init_theme_changer() -> None:
    theme_did_change.append(decide_theme)
