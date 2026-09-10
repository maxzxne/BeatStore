import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ruCount, ruPlural } from './ruPlural.js';

describe('ruPlural', () => {
  it('picks nominative singular for 1, 21, 101', () => {
    assert.equal(ruPlural(1, 'товар', 'товара', 'товаров'), 'товар');
    assert.equal(ruPlural(21, 'товар', 'товара', 'товаров'), 'товар');
    assert.equal(ruPlural(101, 'товар', 'товара', 'товаров'), 'товар');
  });

  it('picks genitive singular for 2-4, 22, 104', () => {
    assert.equal(ruPlural(2, 'товар', 'товара', 'товаров'), 'товара');
    assert.equal(ruPlural(3, 'товар', 'товара', 'товаров'), 'товара');
    assert.equal(ruPlural(4, 'товар', 'товара', 'товаров'), 'товара');
    assert.equal(ruPlural(22, 'товар', 'товара', 'товаров'), 'товара');
    assert.equal(ruPlural(104, 'товар', 'товара', 'товаров'), 'товара');
  });

  it('picks genitive plural for 0, 5-20, 11-14, 25', () => {
    for (const n of [0, 5, 10, 11, 12, 13, 14, 20, 25]) {
      assert.equal(ruPlural(n, 'товар', 'товара', 'товаров'), 'товаров');
    }
  });
});

describe('ruCount cart copy', () => {
  it('declines товар in cart subtitle', () => {
    assert.equal(ruCount(1, 'товар', 'товара', 'товаров'), '1 товар');
    assert.equal(ruCount(2, 'товар', 'товара', 'товаров'), '2 товара');
    assert.equal(ruCount(5, 'товар', 'товара', 'товаров'), '5 товаров');
    assert.equal(ruCount(11, 'товар', 'товара', 'товаров'), '11 товаров');
    assert.equal(ruCount(21, 'товар', 'товара', 'товаров'), '21 товар');
  });

  it('declines трек on the catalog count', () => {
    assert.equal(ruCount(1, 'трек', 'трека', 'треков'), '1 трек');
    assert.equal(ruCount(2, 'трек', 'трека', 'треков'), '2 трека');
    assert.equal(ruCount(5, 'трек', 'трека', 'треков'), '5 треков');
    assert.equal(ruCount(11, 'трек', 'трека', 'треков'), '11 треков');
  });

  it('declines день for order deadlines including 21', () => {
    assert.equal(ruCount(1, 'день', 'дня', 'дней'), '1 день');
    assert.equal(ruCount(2, 'день', 'дня', 'дней'), '2 дня');
    assert.equal(ruCount(4, 'день', 'дня', 'дней'), '4 дня');
    assert.equal(ruCount(5, 'день', 'дня', 'дней'), '5 дней');
    assert.equal(ruCount(11, 'день', 'дня', 'дней'), '11 дней');
    assert.equal(ruCount(21, 'день', 'дня', 'дней'), '21 день');
    assert.equal(ruCount(22, 'день', 'дня', 'дней'), '22 дня');
  });

  it('declines adjective+noun for free checkout button', () => {
    assert.equal(
      ruCount(1, 'бесплатный товар', 'бесплатных товара', 'бесплатных товаров'),
      '1 бесплатный товар',
    );
    assert.equal(
      ruCount(2, 'бесплатный товар', 'бесплатных товара', 'бесплатных товаров'),
      '2 бесплатных товара',
    );
    assert.equal(
      ruCount(5, 'бесплатный товар', 'бесплатных товара', 'бесплатных товаров'),
      '5 бесплатных товаров',
    );
    assert.equal(
      ruCount(11, 'бесплатный товар', 'бесплатных товара', 'бесплатных товаров'),
      '11 бесплатных товаров',
    );
  });
});
