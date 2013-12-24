# JSON -> JSON

## Labels

Переписываем [labels.js](https://github.yandex-team.ru/Daria/mail-node/blob/master/jsx/labels.js).

```js
//  Или же int2color и т.д.
external scalar int2hex( scalar )

labels
    {
        //  label: map object .labels, label
        label: [
            for id in .labels
                label id
        ]
    }

label ( id )
    {
        lid: id

        count: .messagesCount

        name = scalar .name
        if name == 'priority_high'
            symbol: name
            name: 'Важные'
        else
            name: name

        if .isUser
            user: true
        else
            default: true

        if .color
            color: int2hex .color
    }
```

`map`, `sort` и т.д. должны работать и как функция, и как метод массива:

```js
labels {
    //  Говорим, что внутри `.labels` должен быть массив.
    //  FIXME: Имя переменной пересекается с именем шаблона (функции).
    {
        label: map array .labels label
        //  label: ( array .labels ).map label
    }
}
```


## Folders

Переписываем [folders.js](https://github.yandex-team.ru/Daria/mail-node/blob/master/jsx/folders.js).

```js
external scalar folder_name( scalar )
//  name => name.substr( name.lastIndexOf( '|' ) + 1 )

folders
    all_folders = {}
    user_folders = []

    total_new = 0

    for id in .folders
        with folder id
            if .symbol
                all_folders[ .symbol ] = .
            else
                all_folders[ .fid ] = .
                user_folders.push folder

            total_new += .new

    user_folders.sort .name

    for user_folders
        if .parent_id
            .name = folder_name .name

            parent_folder = all_folders[ .parent_id ]
            //  FIXME: Или тут должно быть `if exists .subfolders`?
            if .subfolders
                push .subfolders, .fid
            else
                .subfolders = [ .fid ]

    //  Финальный результат.
    {
        new: total_new

        folder: [
            all_folders.inbox

            //  FIXME: Тут нельзя написать просто `user_folders`,
            //  так как это будет просто массив внутри массива.
            //  Нужно сделать concat. Например, пусть пока что будет `*user_folders`.
            *user_folders

            all_folders.sent
            all_folders.trash
            all_folders.spam
            all_folders.draft
        ]
    }

folder ( id )
    {
        fid: id

        count: .messagesCount
        new: .newMessagesCount

        name: .name

        shared: ( .shared === '1' )
        user: bool .isUser

        if .isSystem
            default: true

            symbol = scalar .symbolicName.title
            symbol: symbol

            if symbol === 'trash' || symbol === 'spam'
                clear: true

        parent_id = scalar .parentId
        if parent_id !== '' && parent_id !== '0'
            parent_id: parent_id
    }
```

В этом варианте используются mutable объекты и массивы. И даже скаляры.
В принципе, можно обойтись и без этого, наверное, но в несколько проходов.

