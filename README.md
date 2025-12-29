# Gerenciador de Territórios (Firebase Edition)

Sistema profissional para gestão de territórios de congregação.

## 🚀 Tecnologias
- **Frontend**: React + Tailwind CSS
- **Auth**: Firebase Authentication (E-mail/Senha)
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage (Arquivos PDF)

## 🛠 Configuração no Firebase Console

1.  **Authentication**: Ative o método "E-mail/Senha".
2.  **Firestore**: Crie o banco de dados em "Production Mode" e aplique as regras contidas em `firebase/firestore.rules`.
3.  **Storage**: Crie o bucket e aplique as regras em `firebase/storage.rules`.
4.  **Primeiro Admin**: O primeiro usuário a se cadastrar no sistema recebe automaticamente a função de `admin`. Você pode alterar as funções de outros usuários através do painel "Usuários" dentro do app.

## 📂 Estrutura de Pastas do Storage
Os mapas devem ser salvos na pasta `/maps/` dentro do Storage. O sistema gerencia os nomes automaticamente usando timestamps para evitar duplicidade.

---
*territorio v1.7 - Integrado com Firebase*