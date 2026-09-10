# Acceptance checklist

## Product

- [ ] Публичный сайт открывается только в V2 (нет V1/V3 switcher)
- [ ] Нет «Marketplace» в UI
- [ ] Каталог / beat / courses / order / login / profile выглядят цельно
- [ ] Плеер работает (play/pause/seek), избранное/корзина не сломаны

## Hero CMS

- [ ] В админке: toggle enabled, texts, upload/remove image left
- [ ] `enabled=false` → hero скрыт на главной
- [ ] С image → картинка слева (desktop), адекватный mobile
- [ ] Тексты с админки видны на staging после сохранения

## Banners

- [ ] CRUD в админке
- [ ] Вне `[starts_at, ends_at]` не показываются
- [ ] `enabled=false` не показывается
- [ ] Слайдер usable с клавиатуры / не ломает CLS жестью

## Admin

- [ ] Новая IA, тёмный V2 shell
- [ ] Beats/Courses редактируются после создания (закрыты старые дыры)
- [ ] Orders/Purchases/Revenue/Errors доступны
- [ ] courses_visibility и oauth settings найдены без квеста

## Ship

- [ ] Изменения в `https://github.com/maxzxne/BeatStore` (`main`)
- [ ] Render: **Manual Deploy → Deploy latest commit** на `srv-d3hc3j2li9vc73e10l80`, статус Live
- [ ] Smoke на `https://beatstore-dpym.onrender.com/`:
  - home + hero
  - open beat + play
  - `/order`
  - `/admin/login` → секция Сайт
  - banner active/inactive sanity (если тестовые даты)

## Report to user

Коротко: что сделано, ссылка на коммит/PR, что проверить руками, известные риски.
