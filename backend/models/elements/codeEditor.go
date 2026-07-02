package elements

import "encoding/json"

func init() {
	Register("codeEditor", func() Element { return &CodeEditor{} })
}

type CodeEditor struct {
	ID       string          `json:"id,omitempty"`
	Code     json.RawMessage `json:"code"`
	Language string          `json:"language,omitempty"`
	MaxLines int             `json:"maxLines,omitempty"`
}

func (ce *CodeEditor) ElementType() string {
	return "codeEditor"
}
