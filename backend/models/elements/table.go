package elements

func init() {
	Register("table", func() Element { return &Table{} })
}

type Table struct {
	Cells [][]Text `json:"cells"`
}

func (t *Table) ElementType() string { return "table" }
