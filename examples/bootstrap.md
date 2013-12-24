# Примеры шаблонов для Boostrap


## Icon

### HTML

```html
<span class="glyphicon glyphicon-star"></span>
```

### Шаблоны

    icon ( id )
        SPAN.glyphicon.glyphicon-{ id }

### Использование

    icon "star"


## Dropdown

### HTML

```html
<div class="dropdown">
  <button class="btn dropdown-toggle sr-only" type="button" id="dropdownMenu1" data-toggle="dropdown">
    Dropdown
    <span class="caret"></span>
  </button>
  <ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu1">
    <li role="presentation"><a role="menuitem" tabindex="-1" href="#">Action</a></li>
    <li role="presentation"><a role="menuitem" tabindex="-1" href="#">Another action</a></li>
    <li role="presentation"><a role="menuitem" tabindex="-1" href="#">Something else here</a></li>
    <li role="presentation" class="divider"></li>
    <li role="presentation"><a role="menuitem" tabindex="-1" href="#">Separated link</a></li>
  </ul>
</div>
```

### Шаблоны

    link ( href = "#" )
        A @href href ...

    dropdown
        DIV.dropdown ...

    dropdown-menu ( id )
        UL.dropdown-menu
            @role "menu"
            @aria-labelledby id
            ...

    dropdown-menu item
        LI @role "presentation" ...

    dropdown-menu item link
        //  Или же main.link?
        super
            @role "menuitem"
            @tabindex -1
            ...

    dropdown-menu divider
        LI.divider @role "presentation

    button ( type = "default" )
        BUTTON.btn.btn-{ type } @type "button"...

    caret
        SPAN.caret

    dropdown-toggle
        @class "{ @class } dropdown-toggle"
        @data-toggle "dropdown"

### Использование

    dropdown
        button
            @id "dropdownMenu1"
            dropdown-toggle "dropdown"

            "Dropdown "
            caret

        dropdown-menu id: "dropdownMenu1"
            item link "Action"
            item link "Another action"
            item link "Something else here"
            divider
            item link "Separated link"

## Button group

### HTML

```html
<div class="btn-group">
  <button type="button" class="btn btn-default">Left</button>
  <button type="button" class="btn btn-default">Middle</button>
  <button type="button" class="btn btn-default">Right</button>
</div>
```

### Шаблоны

    button-group
        DIV.btn-group ...

### Использование

    button-group
        button "Left"
        button "Middle"
        button "Right"


## Badges

### HTML

```html
<a href="#">Inbox <span class="badge">42</span></a>
```

### Шаблоны

    badge ( count )
        SPAN.badge count

### Использование

    link
        "Inbox "
        badge 42


## Pagination

### HTML

```html
<ul class="pagination">
  <li class="disabled"><a href="#">&laquo;</a></li>
  <li><a href="#">1</a></li>
  <li class="active"><a href="#">2 <span class="sr-only">(current)</span></a></li>
  <li><a href="#">3</a></li>
  <li><a href="#">4</a></li>
  <li><a href="#">5</a></li>
  <li><a href="#">&raquo;</a></li>
</ul>
```

### Шаблоны

    //  TODO: Обрабатывать #disabled, #active.

    pager
        UL.pagination ...

    pager item ( href )
        LI
            link href: href ...

    //  Хорошо бы тут иметь авто-проброс параметров.

    pager left
        item "&laquo;"

    pager right
        item "&raquo;"

    pager page
        item ...

### Использование

    pager
        left #disabled
        page 1
        page #active 2
        page 3
        page 4
        page 5
        right

