//shortcut trigger declaration

//shortcut trigger declaration

var shortcut_parser = shortcut => {
    let result = shortcut.toLowerCase().split("+")
    return result
}

var conditions_converter = (conditions, event) => {
    let result = ''
    conditions.forEach((check, i) => {
        if (check === 'control' | check === 'ctrl'){
            result += event + '.ctrlKey'
        }
        else if (check === 'shift'){
            result += event + '.shiftKey'
        }
        else if (check === 'alt'){
            result += event + '.altKey'
        }
        else if (check === 'meta'){
            result += event + '.altKey'
        }
        else{
            result += `${event}.key.toLowerCase() === '${check}'`
        }
        if (i != conditions.length-1) result += ' && '
    })
    return result
}

let jishoButtons = shortcut_parser(globalThis.jisho_trigger)
globalThis.jisho_trigger_condition = conditions_converter(jishoButtons, 'event')

let wikipediaButtons = shortcut_parser(globalThis.wikipedia_trigger)
globalThis.wikipedia_trigger_condition = conditions_converter(wikipediaButtons, 'event')