from aqt.gui_hooks import reviewer_did_show_answer, reviewer_did_show_question
from aqt import mw

class reviewer_checker:
    def __init__(self):
        reviewer_did_show_answer.append(self.on_reviewer_did_show_answer)
        reviewer_did_show_question.append(self.on_reviewer_did_show_question)

    def on_reviewer_did_show_answer(self, card):
        mw.web.eval("answer_is_shown();")
    
    def on_reviewer_did_show_question(self, card):
        mw.web.eval("question_is_shown();")
