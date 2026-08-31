if (document.getElementById('temp') == null) {
  const temp = document.createElement("div")
  temp.setAttribute("id", "temp")
  document.body.appendChild(temp)
}

card_is_flipped = false;
const question_is_shown = () => {
  card_is_flipped = false;
}
const answer_is_shown = () => {
  card_is_flipped = true;
}

set_dark_mode = () => {
  globalThis.theme = "jishodark"
}
set_light_mode = () => {
  globalThis.theme = "jisholight"
}

// ── Jisho resolver (called by Python) ──
window.__jisho_resolve = function(requestId, envelope) {
  if (window.__jisho_callbacks && window.__jisho_callbacks[requestId]) {
    const timeoutId = window.__jisho_callbacks[requestId + '_timeout'];
    if (timeoutId) clearTimeout(timeoutId);
    window.__jisho_callbacks[requestId](envelope);
    delete window.__jisho_callbacks[requestId];
    delete window.__jisho_callbacks[requestId + '_timeout'];
  }
};

// ── Fetch Jisho via Python bridge ──
async function fetchJisho(search) {
  // Use Python bridge if pycmd is available
  if (typeof pycmd === 'function') {
    return new Promise((resolve, reject) => {
      const requestId = 'jisho_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      if (!window.__jisho_callbacks) {
        window.__jisho_callbacks = {};
      }
      window.__jisho_callbacks[requestId] = resolve;
      const timeoutId = setTimeout(() => {
        if (window.__jisho_callbacks[requestId]) {
          delete window.__jisho_callbacks[requestId];
          resolve({ ok: false, data: null, error: 'timeout' });
        }
      }, 5000);
      window.__jisho_callbacks[requestId + '_timeout'] = timeoutId;

      const payload = JSON.stringify({
        action: 'lookup',
        request_id: requestId,
        query: search
      });
      pycmd('jisho:' + payload);
    })
    .then(envelope => {
      if (envelope && envelope.ok && envelope.data && envelope.data.data) {
        return envelope.data;
      }
      return null;
    })
    .catch(err => {
      console.warn('Python bridge error:', err);
      return null;
    });
  }

  console.warn('Jisho bridge not available – skipping to Wikipedia fallback.');
  return null;
}

//////////////////////// MAIN /////////////////////////////
window.addEventListener("keydown", async function (event) {
  const isJisho = eval(globalThis.jisho_trigger_condition);
  const isWikipedia = eval(globalThis.wikipedia_trigger_condition);
  if (!isJisho && !isWikipedia) return;
  if (globalThis.backside && !card_is_flipped) return;

  let sel_element = window.getSelection()
  let lookUpTxt = sel_element.toString().trim()
  if (lookUpTxt == "") return

  let pos = sel_element.getRangeAt(0).getBoundingClientRect()

  temp.style.left = `calc(${pos.left}px + ${pos.width / 2}px)`
  let placement = "bottom"
  if (pos.top > window.innerHeight / 2) {
    temp.style.top = `${pos.top}px`
    placement = "top"
  } else {
    temp.style.top = `calc(${pos.top}px + ${pos.height}px)`
  }

  if (isJisho) {
    await createJishoToolTip(lookUpTxt, placement)
  } else if (isWikipedia) {
    await createWikiToolTip(globalThis.lookup_language, lookUpTxt, placement)
  }
})
////////////////////// MAIN END ///////////////////////////

async function createJishoToolTip(search, placement) {
  let jisho = document.createElement("div")
  jisho.classList.add("jisho-result")

  jisho.innerHTML = `<div class="jisho-loading">🔍 Looking up...</div>`;
  
  var [instance] = tippy("#temp", {
    content: jisho,
    sticky: true,
    interactive: true,
    theme: globalThis.theme,
    appendTo: document.body,
    delay: [100, 100],
    touch: ["hold", 300],
    animation: "scale-extreme",
    placement: placement
  })
  instance.show()

  let data = await fetchJisho(search)

  if (data && data.data && data.data.length > 0) {
    let first = data.data[0]
    let word = first.japanese[0]?.word || search
    let reading = first.japanese[0]?.reading || ""
    let meanings = first.senses.map(s => s.english_definitions.join(', ')).join('<br>')
    let parts = first.senses[0]?.parts_of_speech?.join(', ') || ""

    jisho.innerHTML = `
      <div style="font-weight:bold;font-size:1.1em;padding:0.4em 0.8em 0.2em;">${word}</div>
      <div style="font-size:0.85em;color:var(--text-secondary, #888);padding:0 0.8em 0.4em;">${reading}</div>
      <div style="padding:0 0.8em 0.4em;border-top:1px solid var(--border-main, #ddd);">
        ${meanings}
      </div>
      <div style="font-size:0.75em;color:var(--text-secondary, #888);padding:0.4em 0.8em;border-top:1px solid var(--border-main, #ddd);">
        ${parts}
        <br><a href="https://jisho.org/search/${encodeURIComponent(search)}" target="_blank" style="color:var(--text-accent, #4a7fa8);">Open in Jisho →</a>
      </div>
    `
  } else {
    instance.hide()
    await createWikiToolTip(globalThis.lookup_language, search, placement)
  }
}

// ── Wikipedia fallback (unchanged) ──
async function createWikiToolTip(lang, search, placement) {
  try {
    let wiki = document.createElement("div")
    wiki.classList.add("tippy-wiki")

    let previewData = await createWikiPreview(lang, search)

    let thumbnailHtml = ''
    if (previewData && previewData.thumbSrc) {
      thumbnailHtml = `<img src="${previewData.thumbSrc}" style="width:100%; max-height:150px; object-fit:cover; border-radius:4px 4px 0 0; margin-bottom:4px;">`
    }

    let blurbHtml = ''
    if (previewData && previewData.blurbTxt) {
      blurbHtml = `<div style="padding:0 0.8em 0.8em; font-size:0.9rem; line-height:1.5;">${previewData.blurbTxt}</div>`
    } else {
      blurbHtml = `<div style="padding:0.8em; font-size:0.9rem; line-height:1.5;">No Wikipedia article found for "<strong>${search}</strong>".</div>`
    }

    let titleHtml = previewData && previewData.title ? `<div style="font-weight:bold;font-size:1.05rem;padding:0.4em 0.8em 0.2em;">${previewData.title}</div>` : ''

    wiki.innerHTML = thumbnailHtml + titleHtml + blurbHtml

    var [instance] = tippy("#temp", {
      content: wiki,
      sticky: true,
      interactive: true,
      theme: globalThis.theme,
      appendTo: document.body,
      delay: [100, 100],
      touch: ["hold", 300],
      animation: "scale-extreme",
      placement: placement
    })
    instance.show()
  } catch (e) {
    console.warn("Wikipedia fallback failed:", e)
  }
}

async function createWikiPreview(lang, search) {
  let thumbParams = {
    action: "query",
    format: "json",
    prop: "pageimages",
    pithumbsize: 400,
  }

  let blurbParams = {
    action: "query",
    format: "json",
    prop: "extracts",
    exsentences: 2,
    exintro: 1,
  }
  try {
    let title = await getTitle(lang, search)
    if (!title) return null

    let thumbSrc = await getData(lang, title, thumbParams)
    let blurbTxt = await getData(lang, title, blurbParams)

    let previewData = {
      "title": title,
      "thumbSrc": (thumbSrc && thumbSrc.thumbnail && thumbSrc.thumbnail.source) ? thumbSrc.thumbnail.source : null,
      "blurbTxt": (blurbTxt && blurbTxt.extract) ? blurbTxt.extract : null
    }
    return previewData
  } catch (e) {
    console.warn("Wikipedia preview error:", e)
    return null
  }
}

async function getData(lang, title, params) {
  params.titles = title
  let url = wikiUrl(lang, params)
  let response = await wikiFetch(url)
  let pages = response.query.pages
  return pages[Object.keys(pages)[0]]
}

async function getTitle(lang, search) {
  var titleParams = {
    action: "query",
    list: "search",
    format: "json",
    srlimit: 1,
    srsearch: search,
    srwhat: "text"
  };
  let url = wikiUrl(lang, titleParams)
  let response = await wikiFetch(url)
  if (response.query && response.query.search && response.query.search.length > 0) {
    return response.query.search[0].title
  }
  return null
}

var wikiUrl = (lang, params) => {
  let url = `https://${lang}.wikipedia.org/w/api.php`;
  url = url + "?origin=*";
  Object.keys(params).forEach(function (key) {
    url += "&" + key + "=" + params[key]
  })
  return url
}

async function wikiFetch(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(function (response) { return response.json(); })
      .then(function (response) {
        resolve(response)
      })
      .catch(function (error) { 
        console.log("Wikipedia fetch error:", error);
        reject(error);
      });
  })
}