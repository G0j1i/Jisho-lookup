from os.path import dirname, realpath
from pathlib import Path

from aqt import mw
from aqt.gui_hooks import webview_will_set_content, webview_did_receive_js_message
from aqt.reviewer import Reviewer
from aqt.webview import WebContent

from .Config.config import jisho_trigger, wikipedia_trigger, lookup_language, backside
from .theme_manager import decide_theme

import json
import urllib.request
import urllib.parse
import threading


class jishoLookup:
    def __init__(self):
        print("JishoLookup initialized")
        mw.addonManager.setWebExports(__name__, r"(web|Config)/.*\.(js|css|svg|json)")
        webview_will_set_content.append(self.on_webview_will_set_content)
        webview_did_receive_js_message.append(self._handle_js_message)

    def on_webview_will_set_content(self, web_content: WebContent, context):
        if not isinstance(context, Reviewer):
            return

        addon_package = mw.addonManager.addonFromModule(__name__)

        popper = "<script src=\"https://unpkg.com/@popperjs/core@2\"></script>"
        tippy = "<script src=\"https://unpkg.com/tippy.js@6\"></script>"
        theme = "globalThis.theme = \"jisholight\";\n"
        if decide_theme():
            theme = "globalThis.theme = \"jishodark\";\n"

        web_content.head += popper + tippy

        web_content.css.append(
            f"/_addons/{addon_package}/web/jishoLookup.css")

        web_content.head += (
            "<script>"
            f"globalThis.jisho_trigger = \"{jisho_trigger.value}\";\n"
            f"globalThis.wikipedia_trigger = \"{wikipedia_trigger.value}\";\n"
            f"globalThis.lookup_language = \"{lookup_language.value}\";\n"
            f"globalThis.backside = {str(backside.value).lower()};\n"
            + theme +
            "</script>"
        )

        web_content.js.append(
            f"/_addons/{addon_package}/web/addon_trigger.js")
        web_content.js.append(
            f"/_addons/{addon_package}/web/jishoLookup.js")

    def _handle_js_message(self, handled, message, context):
        # IMPORTANT: preserve Anki's own handled value for non‑Jisho messages
        if not message.startswith("jisho:"):
            return handled

        try:
            payload = json.loads(message[6:])
            action = payload.get("action")
            request_id = payload.get("request_id")
            query = payload.get("query")

            if action != "lookup" or not request_id or not query:
                return handled

            threading.Thread(
                target=self._fetch_jisho,
                args=(context, request_id, query),
                daemon=True
            ).start()

            # We've handled our own message; stop further processing
            return (True, None)

        except Exception as e:
            print(f"Jisho bridge parse error: {e}")
            return handled

    def _fetch_jisho(self, context, request_id, query):
        url = f"https://jisho.org/api/v1/search/words?keyword={urllib.parse.quote(query, safe='')}"
        ok = False
        data = None
        error = None

        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                data = json.loads(response.read().decode())
                ok = True
        except Exception as e:
            error = str(e)
            print(f"Jisho fetch error: {error}")

        envelope = {"ok": ok, "data": data, "error": error}

        mw.taskman.run_on_main(
            lambda: self._send_result(context, request_id, envelope)
        )

    def _send_result(self, context, request_id, envelope):
        try:
            js = json.dumps(envelope)
            context.web.eval(
                f"window.__jisho_resolve("
                f"{json.dumps(request_id)}, "
                f"{js}"
                f");"
            )
        except Exception as e:
            print(f"Jisho bridge response error: {e}")

    def get_source(self, source_name):
        filepath = Path(dirname(realpath(__file__)), source_name)
        with open(filepath, mode="r", encoding="utf-8") as file:
            return file.read()