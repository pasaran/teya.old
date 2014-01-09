# Grammar

    module := ( def_var | def_func | def_template )+

    def_var := ID "=" body
    def_func := "func" ID args body
    def_template := ID args? body

    body := inline_expr | EOL block

    args := "(" arg ( "," arg )* ")"
    arg := TYPE? ID ( "=" inline_expr )?

    expr := if | for | with | object | array | pairs | items | template

    if := "if" inline_expr body ( "else if" inline_expr body )* ( "else" body )?

    for := "for" ( inline_expr body | ID "in" inline_expr body )

    with := "with" inline_expr body

    object := "{" body "}"

    array := "[" body "]"

    pairs := pair ( "," pair )*
    pair := ( ID | string ) ":" body

    items := value ( "," value )*

    value := inline_expr

    template := ID inline_call_args? ( "->" expr )? body?
    inline_call_args := inline_call_arg ( "," inline_call_arg )*
    inline_call_arg := ID ":" inline_expr
    block_call_arg := ID ":" body

    block := INDENT block_call_arg* ( expr | def_var )+ DEDENT

    inline_expr := inline_or
    inline_or := inline_and ( "||" inline_or )?
    inline_and := inline_eq ( "&&" inline_and )?
    inline_eq := inline_rel ( ( "==" | "!=" | "===" | "!==" ) inline_rel )?
    inline_rel := inline_add ( ( "<" | "<=" | ">" | ">=" ) inline_add )?
    inline_add := inline_mul ( ( "+" | "-" ) inline_add )?
    inline_mul := inline_unary ( ( "*" | "/" | "%" ) inline_mul )?
    inline_unary := "-" inline_not | inline_not
    inline_not := "!" inline_union | inline_union
    inline_union := inline_primary ( "|" inline_union )?

    inline_primary := number | string | inline_subexpr | jpath | "true" | "false" | "null" | var | func

    inline_subexpr := "(" inline_expr ")"

    var := ID

    func := ID "(" ( expr ( "," expr )* )? ")" ( "->" expr )

    jpath := ( "/" )? jpath_step+
    jpath_step := ( jpath_nametest | jpath_predicate )+
    jpath_nameteset := "." ( ID | "*" )
    jpath_predicate := "[" inline_expr "]"

    string := "'" string_content "'" | '"' string_content '"'

    number := NUMBER

    TYPE := "scalar" | "node" | "object" | "array" | "bool" | "func" | "xml" | "any"

