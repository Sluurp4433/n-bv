-- Ny roll: styrelse (får bl.a. ladda upp dokument). Egen migration p.g.a. enum-hantering.
alter type public.user_role add value if not exists 'styrelse';
