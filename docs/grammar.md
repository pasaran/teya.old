# Grammar

    module := def*

    def := var | func

    var := ID "=" expr

    func := ID+ func-args? expr
    func-args := "(" arg ( "," arg )* ")"
    func-arg := TYPE? ID ( "=" expr )? ( "..." )?

    expr := if | for | with | when | object | array | pairs | items | call | xml | block | inline-expr

    if := "if" expr expr ( "else if" expr expr )* ( "else" expr )?

    for := "for" ( expr expr | iterator "in" expr expr )

    with := "with" expr expr

    when := "when" expr? INDENT case+ default? DEINDENT
    when-case := expr ":" expr
    when-default := expr

    object := "{" ( expr ( "," expr )* | block ) "}"

    array := "[" ( expr ( "," expr )* | block ) "]"

    pairs := pair ( "," pair )*
    pair := ( ID | string ) ":" expr

    items := expr ( "," expr )*

    call := ID call-args? expr?
    call-args := call-arg ( "," call-arg )*
    call-arg := arg-name ":" expr

    xml := TAGNAME( "." ID | "#" ID )* xml-attr* expr
    xml-attr := "@" ID expr?

    block := INDENT ( expr | def )+ DEINDENT

    inline-expr := inline-or
    inline-or := inline-and ( "||" inline-or )?
    inline-and := inline-eq ( "&&" inline-and )?
    inline-eq := inline-rel ( ( "==" | "!=" | "===" | "!==" ) inline-rel )?
    inline-rel := inline-add ( ( "<" | "<=" | ">" | ">=" ) inline-add )?
    inline-add := inline-mul ( ( "+" | "-" ) inline-add )?
    inline-mul := inline-unary ( ( "*" | "/" | "%" ) inline-mul )?
    inline-unary := "-" inline-not | inline-not
    inline-not := "!" inline-union | inline-union
    inline-union := inline-primary ( "|" inline-union )?

    inline-primary := number | string | subexpr | jpath | "true" | "false" | "null" | inline-var | "..."

    subexpr := "(" expr ")"

    inline-var := ID

    jpath := ( "/" )? jpath-step+
    jpath-step := ( jpath-nametest | jpath-predicate )+
    jpath-nameteset := "." ( ID | "*" )
    jpath-predicate := "[" expr "]"

    string := """ string-content """

    number := NUMBER

    TYPE := "scalar" | "node" | "object" | "array" | "bool" | "func" | "xml" | "any"

