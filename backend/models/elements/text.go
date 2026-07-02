package elements

import "encoding/json"

func init() {
	Register("text", func() Element { return &Text{} })
}

type Text struct {
	// ID is set when Text is used as a top-level element; it stays empty
	// when Text is nested inside other elements (options, headers, cells).
	ID      string          `json:"id,omitempty"`
	Content json.RawMessage `json:"content"`
}

func (t *Text) ElementType() string { return "text" }

// UnmarshalJSON accepts either the new object form {"content": ...}
// or a legacy plain string, converting the string to a minimal TipTap doc.
func (t *Text) UnmarshalJSON(data []byte) error {
	// Try object form first.
	type plain Text
	var obj plain
	if err := json.Unmarshal(data, &obj); err == nil {
		t.ID = obj.ID
		t.Content = obj.Content
		return nil
	}
	// Fall back: treat as a plain string and wrap in a TipTap paragraph doc.
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	if s == "" {
		t.Content = nil
		return nil
	}
	doc := map[string]any{
		"type": "doc",
		"content": []any{
			map[string]any{
				"type": "paragraph",
				"content": []any{
					map[string]any{"type": "text", "text": s},
				},
			},
		},
	}
	b, err := json.Marshal(doc)
	if err != nil {
		return err
	}
	t.Content = b
	return nil
}
