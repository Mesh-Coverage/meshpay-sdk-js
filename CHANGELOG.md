# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2024-01-15

### Added

- Initial release of Meshpay SDK for Node.js
- Customers module: create, read, update, delete, and KYC upgrade
- Accounts module: virtual account management, linking, balance queries, bank resolution
- Payments module: transfer creation, transaction listing and retrieval
- Bills module: bill payment, data plans, electricity providers, customer lookup
- Identity module: BVN verification
- Full TypeScript support with complete type definitions
- HMAC-SHA256 request signing for secure API communication
- Automatic request retries with exponential backoff
- Comprehensive error handling with MeshpaySDKError
- Pagination support for list endpoints
- Request timeout and retry configuration
- Complete documentation and examples
- Jest test setup and ESLint configuration

### Features

- 🔐 HMAC-SHA256 request signing
- 🔄 Automatic retries with exponential backoff
- 📦 Full TypeScript support
- 🛠️ Modular architecture
- ⚡ Lightweight with minimal dependencies
- 📚 Comprehensive documentation

---

For more details on updating this changelog, visit [Keep a Changelog](https://keepachangelog.com/).
