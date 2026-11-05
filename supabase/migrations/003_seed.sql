-- Seed de desenvolvimento (dados fictícios)
-- Execute após criar usuários no Auth e mapear UUIDs em profiles.
-- Este arquivo documenta o conteúdo esperado; o app já inclui seed local no modo demo.

insert into public.members (id, full_name, phone, email, monthly_fee_amount, due_day, entry_date, status, admin_notes)
values
  ('11111111-1111-1111-1111-111111111101', 'Ana Souza', '(11) 98888-1001', 'ana@email.com', 80, 10, '2025-01-15', 'ativo', 'Dados fictícios'),
  ('11111111-1111-1111-1111-111111111102', 'Carlos Lima', '(11) 97777-2002', 'carlos@email.com', 80, 10, '2024-08-01', 'ativo', 'Em atraso — demonstração'),
  ('11111111-1111-1111-1111-111111111103', 'Márcia Santos', '(11) 96666-3003', null, 80, 15, '2025-03-20', 'ativo', null)
on conflict (id) do nothing;

insert into public.expenses (category, description, amount, due_date, competence, status)
values
  ('luz', 'Conta de luz', 220, current_date + 5, to_char(now(), 'YYYY-MM'), 'EM_ABERTO'),
  ('agua', 'Conta de água', 95, current_date - 2, to_char(now(), 'YYYY-MM'), 'PAGA'),
  ('internet', 'Internet do barracão', 110, current_date + 3, to_char(now(), 'YYYY-MM'), 'EM_ABERTO');

insert into public.clients (id, full_name, phone, email, notes)
values
  ('22222222-2222-2222-2222-222222222201', 'Juliana Ferreira', '(11) 95555-4004', 'cliente@ileoloroke.demo', 'Cliente de demonstração'),
  ('22222222-2222-2222-2222-222222222202', 'Roberto Alves', '(11) 94444-5005', 'roberto@email.com', 'Prefere atendimentos à tarde'),
  ('22222222-2222-2222-2222-222222222203', 'Patrícia Mendes', '(11) 93333-6006', null, null)
on conflict (id) do nothing;
