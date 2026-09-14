from musilogy.seriation import seriate

A, B, C, D, E, F = (f"{i:08d}-0000-0000-0000-000000000000" for i in range(6))


def test_an_empty_or_tiny_input_comes_back_sorted():
    assert seriate([], {}) == []
    assert seriate([B, A], {}) == [A, B]


def test_a_chain_comes_out_as_a_chain():
    # A-B-C-D linked only to their neighbours: the only orders that put every
    # linked pair adjacent are the chain and its mirror, and the mirror is
    # ruled out because the first mbid must be smaller than the last.
    weights = {(A, B): 0.9, (B, C): 0.9, (C, D): 0.9}
    assert seriate([A, B, C, D], weights) == [A, B, C, D]


def test_two_cliques_do_not_interleave():
    weights = {(A, B): 0.9, (A, C): 0.9, (B, C): 0.9, (D, E): 0.9, (D, F): 0.9, (E, F): 0.9}
    order = seriate([A, B, C, D, E, F], weights)
    assert sorted(order) == sorted([A, B, C, D, E, F])
    first = {order[0], order[1], order[2]}
    assert first in ({A, B, C}, {D, E, F})


def test_an_unlinked_genre_does_not_split_a_clique():
    weights = {(A, B): 0.9, (A, C): 0.9, (B, C): 0.9}
    order = seriate([A, B, C, D], weights)
    assert order.index(D) in (0, 3)


def test_the_result_does_not_depend_on_the_order_of_the_input():
    # The one property the whole pipeline's reproducibility rests on. scipy's
    # optimal leaf ordering does not have it: it breaks its ties by array index.
    weights = {(A, B): 0.9, (B, C): 0.4, (C, D): 0.9, (A, D): 0.2, (B, D): 0.1}
    reference = seriate([A, B, C, D], weights)
    for permutation in ([D, C, B, A], [C, A, D, B], [B, D, A, C]):
        assert seriate(permutation, weights) == reference


def test_the_result_does_not_depend_on_the_order_of_the_weights():
    weights = {(A, B): 0.9, (B, C): 0.4, (C, D): 0.9}
    reversed_weights = dict(reversed(list(weights.items())))
    assert seriate([A, B, C, D], weights) == seriate([A, B, C, D], reversed_weights)


def test_ties_are_broken_by_mbid_not_by_position():
    # Every pair equally close: nothing but the mbid can decide, so the answer
    # is the sorted order whatever the input looked like.
    ids = [C, A, E, B, D]
    weights = {(x, y): 0.5 for x in sorted(ids) for y in sorted(ids) if x < y}
    assert seriate(ids, weights) == sorted(ids)
