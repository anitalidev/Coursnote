package elements

import (
	"encoding/json"
	"fmt"
)

type Element interface {
	ElementType() string
}

// elementFactory creates a zero-value Element for a given type name.
type elementFactory func() Element

var registry = map[string]elementFactory{}

// Register associates a type name with a factory. Call from each element's init().
func Register(typeName string, factory elementFactory) {
	registry[typeName] = factory
}

// MarshalElements serializes a slice of Element to JSON.
// Each object in the array gets a top-level "type" field injected.
func MarshalElements(elems []Element) (json.RawMessage, error) {
	out := make([]json.RawMessage, 0, len(elems))
	for _, e := range elems {
		raw, err := json.Marshal(e)
		if err != nil {
			return nil, err
		}
		// Merge the "type" field into the object.
		var obj map[string]json.RawMessage
		if err := json.Unmarshal(raw, &obj); err != nil {
			return nil, err
		}
		typeBytes, _ := json.Marshal(e.ElementType())
		obj["type"] = typeBytes
		merged, err := json.Marshal(obj)
		if err != nil {
			return nil, err
		}
		out = append(out, merged)
	}
	return json.Marshal(out)
}

// UnmarshalElements deserializes a JSON array into a []Element slice,
// dispatching each object to the correct concrete type via its "type" field.
func UnmarshalElements(data json.RawMessage) ([]Element, error) {
	var raws []json.RawMessage
	if err := json.Unmarshal(data, &raws); err != nil {
		return nil, err
	}

	elems := make([]Element, 0, len(raws))
	for _, raw := range raws {
		var probe struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(raw, &probe); err != nil {
			return nil, err
		}
		factory, ok := registry[probe.Type]
		if !ok {
			return nil, fmt.Errorf("unknown element type %q", probe.Type)
		}
		elem := factory()
		if err := json.Unmarshal(raw, elem); err != nil {
			return nil, err
		}
		elems = append(elems, elem)
	}
	return elems, nil
}
