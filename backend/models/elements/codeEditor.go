package elements

import "encoding/json"

func init() {
	Register("codeEditor", func() Element { return &CodeEditor{} })
}

type CodeEditor struct {
	Code json.RawMessage `json:"code"`
}

func (ce *CodeEditor) ElementType() string {
	return "codeEditor"
}
