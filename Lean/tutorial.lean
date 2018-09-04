/- basic induction principle
rec
rec_on
constructor.inj
constructor.eq
-/

/- basic proof tatic
axiom <-> constant (postulate)
assume <-> lambda
show , from <-> term with anotated type
have,from  <-> let in
suffices from <-> beta reduction: (lambda subgoal -> global goal) subgoal
-/

variables p q : Prop

example (h : p ∨ q) : q ∨ p :=
h.elim
  (assume hp : p,
    show q ∨ p, from or.intro_right q hp)
  (assume hq : q,
    show q ∨ p, from or.intro_left p hq)

example : p ∨ q -> q ∨ p
| (or.inl hp) := or.inr hp
| (or.inr hq) := or.inl hq

example (hp : p) (hnp : ¬p) : q := false.elim (hnp hp)

example (hp : p) (hnp : ¬p) : q := absurd hp hnp

#check @true.rec

theorem and_swap : p ∧ q ↔ q ∧ p :=
iff.intro
  (assume h : p ∧ q,
    show q ∧ p, from and.intro (and.right h) (and.left h))
  (assume h : q ∧ p,
    show p ∧ q, from and.intro (and.right h) (and.left h))

#check and_swap p q    -- p ∧ q ↔ q ∧ p

theorem and_swap1 : p ∧ q ↔ q ∧ p :=
⟨ assume h, ⟨h.right, h.left⟩,
 λ h, ⟨h.right, h.left⟩ ⟩

example (h : p ∧ q) : q ∧ p := (and_swap p q).mp h

example (h : p ∧ q) : q ∧ p :=
have hp : p, from and.left h,
have hq : q, from and.right h,
show q ∧ p, from and.intro hq hp


section
open classical

#check em p

example (h : ¬¬p) : p :=
by_cases
  (assume h1 : p, h1)
  (assume h1 : ¬p, absurd h1 h)

theorem dne {p : Prop} (h : ¬¬p) : p :=
or.elim (em p)
  (assume hp : p, hp)
  (assume hnp : ¬p, absurd hnp h)
end