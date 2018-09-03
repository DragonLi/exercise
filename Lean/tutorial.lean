universes u v
variables {α : Type u} {β : Type v}

def p : ℕ × ℤ := ⟨1, 2⟩
#check p.fst
#check p.snd

def p' : ℕ × ℤ × bool := ⟨1, 2, tt⟩
#check p'.fst
#check p'.snd.fst
#check p'.snd.snd

def swap_pair (p : α × β) : β × α :=
⟨p.snd, p.fst⟩

theorem swap_conj {a b : Prop} (h : a ∧ b) : b ∧ a :=
⟨h.right, h.left⟩

#check [1, 2, 3].append [2, 3, 4]
#check [1, 2, 3].map (λ x, x^2)

example (p q : Prop) : p ∧ q → q ∧ p :=
λ h, ⟨h.right, h.left⟩

def swap_pair' (p : α × β) : β × α :=
let (x, y) := p in (y, x)

theorem swap_conj' {a b : Prop} (h : a ∧ b) : b ∧ a :=
let ⟨ha, hb⟩ := h in ⟨hb, ha⟩

def swap_pair'' : α × β → β × α :=
λ ⟨x, y⟩, (y, x)

theorem swap_conj'' {a b : Prop} : a ∧ b → b ∧ a :=
assume ⟨ha, hb⟩, ⟨hb, ha⟩