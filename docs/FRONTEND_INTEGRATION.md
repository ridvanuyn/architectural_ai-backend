# Architectural AI - Frontend Integration Guide

Bu döküman, Flutter uygulamasının backend API'si ile nasıl entegre edileceğini açıklar.

## 📋 İçindekiler

- [API Client Kurulumu](#api-client-kurulumu)
- [Authentication Flow](#authentication-flow)
- [Design Generation Flow](#design-generation-flow)
- [Token Management](#token-management)
- [Error Handling](#error-handling)
- [Örnek Kod](#örnek-kod)

---

## API Client Kurulumu

### Base Configuration

```dart
// lib/core/config/api_config.dart

class ApiConfig {
  static const String baseUrl = 'https://api.your-domain.com/api';
  
  // Development
  static const String devBaseUrl = 'http://localhost:3001/api';
  
  static String get currentBaseUrl {
    return const bool.fromEnvironment('dart.vm.product')
        ? baseUrl
        : devBaseUrl;
  }
}
```

### HTTP Client

```dart
// lib/core/services/api_service.dart

import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  final String baseUrl;
  String? _accessToken;
  String? _refreshToken;

  ApiService({required this.baseUrl});

  // Set tokens after login
  void setTokens(String accessToken, String refreshToken) {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
  }

  // Clear tokens on logout
  void clearTokens() {
    _accessToken = null;
    _refreshToken = null;
  }

  // GET request
  Future<Map<String, dynamic>> get(String endpoint) async {
    final response = await http.get(
      Uri.parse('$baseUrl$endpoint'),
      headers: _headers,
    );
    return _handleResponse(response);
  }

  // POST request
  Future<Map<String, dynamic>> post(String endpoint, {Map<String, dynamic>? body}) async {
    final response = await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: _headers,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  // PUT request
  Future<Map<String, dynamic>> put(String endpoint, {Map<String, dynamic>? body}) async {
    final response = await http.put(
      Uri.parse('$baseUrl$endpoint'),
      headers: _headers,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  // DELETE request
  Future<Map<String, dynamic>> delete(String endpoint) async {
    final response = await http.delete(
      Uri.parse('$baseUrl$endpoint'),
      headers: _headers,
    );
    return _handleResponse(response);
  }

  // Multipart upload
  Future<Map<String, dynamic>> uploadImage(String endpoint, File imageFile) async {
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$endpoint'));
    request.headers.addAll(_headers);
    request.files.add(await http.MultipartFile.fromPath('image', imageFile.path));
    
    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    return _handleResponse(response);
  }

  Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
    };
    if (_accessToken != null) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }
    return headers;
  }

  Map<String, dynamic> _handleResponse(http.Response response) {
    final body = jsonDecode(response.body);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }
    
    // Handle token refresh
    if (response.statusCode == 401 && _refreshToken != null) {
      // Trigger token refresh
      throw TokenExpiredException();
    }
    
    throw ApiException(
      statusCode: response.statusCode,
      message: body['message'] ?? 'Unknown error',
    );
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  
  ApiException({required this.statusCode, required this.message});
}

class TokenExpiredException implements Exception {}
```

---

## Authentication Flow

### 1. Register/Login

```dart
// lib/features/auth/services/auth_service.dart

class AuthService {
  final ApiService _api;
  
  AuthService(this._api);

  // Email Registration
  Future<User> register(String email, String password, String name) async {
    final response = await _api.post('/auth/register', body: {
      'email': email,
      'password': password,
      'name': name,
    });
    
    final user = User.fromJson(response['data']['user']);
    _api.setTokens(
      response['data']['token'],
      response['data']['refreshToken'],
    );
    
    // Store tokens securely
    await _secureStorage.write(key: 'accessToken', value: response['data']['token']);
    await _secureStorage.write(key: 'refreshToken', value: response['data']['refreshToken']);
    
    return user;
  }

  // Email Login
  Future<User> login(String email, String password) async {
    final response = await _api.post('/auth/login', body: {
      'email': email,
      'password': password,
    });
    
    final user = User.fromJson(response['data']['user']);
    _api.setTokens(
      response['data']['token'],
      response['data']['refreshToken'],
    );
    
    await _secureStorage.write(key: 'accessToken', value: response['data']['token']);
    await _secureStorage.write(key: 'refreshToken', value: response['data']['refreshToken']);
    
    return user;
  }

  // Google OAuth
  Future<User> loginWithGoogle(GoogleSignInAccount googleUser) async {
    final googleAuth = await googleUser.authentication;
    
    final response = await _api.post('/auth/oauth', body: {
      'provider': 'google',
      'providerId': googleUser.id,
      'email': googleUser.email,
      'name': googleUser.displayName,
      'avatar': googleUser.photoUrl,
    });
    
    final user = User.fromJson(response['data']['user']);
    _api.setTokens(
      response['data']['token'],
      response['data']['refreshToken'],
    );
    
    return user;
  }

  // Apple Sign In
  Future<User> loginWithApple(AuthorizationCredentialAppleID credential) async {
    final response = await _api.post('/auth/oauth', body: {
      'provider': 'apple',
      'providerId': credential.userIdentifier,
      'email': credential.email,
      'name': '${credential.givenName} ${credential.familyName}',
    });
    
    final user = User.fromJson(response['data']['user']);
    _api.setTokens(
      response['data']['token'],
      response['data']['refreshToken'],
    );
    
    return user;
  }

  // Get current user
  Future<User> getCurrentUser() async {
    final response = await _api.get('/auth/me');
    return User.fromJson(response['data']);
  }

  // Refresh token
  Future<void> refreshToken() async {
    final refreshToken = await _secureStorage.read(key: 'refreshToken');
    if (refreshToken == null) throw Exception('No refresh token');
    
    final response = await _api.post('/auth/refresh', body: {
      'refreshToken': refreshToken,
    });
    
    _api.setTokens(
      response['data']['token'],
      response['data']['refreshToken'],
    );
    
    await _secureStorage.write(key: 'accessToken', value: response['data']['token']);
    await _secureStorage.write(key: 'refreshToken', value: response['data']['refreshToken']);
  }

  // Logout
  Future<void> logout() async {
    try {
      await _api.post('/auth/logout');
    } finally {
      _api.clearTokens();
      await _secureStorage.deleteAll();
    }
  }
}
```

### 2. User Model

```dart
// lib/features/auth/models/user.dart

class User {
  final String id;
  final String email;
  final String? name;
  final String? avatar;
  final TokenBalance tokens;
  final Subscription subscription;
  final UserStats stats;
  final UserSettings settings;
  final bool onboardingCompleted;

  User({
    required this.id,
    required this.email,
    this.name,
    this.avatar,
    required this.tokens,
    required this.subscription,
    required this.stats,
    required this.settings,
    required this.onboardingCompleted,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? json['_id'],
      email: json['email'],
      name: json['name'],
      avatar: json['avatar'],
      tokens: TokenBalance.fromJson(json['tokens'] ?? {}),
      subscription: Subscription.fromJson(json['subscription'] ?? {}),
      stats: UserStats.fromJson(json['stats'] ?? {}),
      settings: UserSettings.fromJson(json['settings'] ?? {}),
      onboardingCompleted: json['onboarding']?['completed'] ?? false,
    );
  }
}

class TokenBalance {
  final int balance;
  final int totalPurchased;
  final int totalUsed;

  TokenBalance({
    required this.balance,
    required this.totalPurchased,
    required this.totalUsed,
  });

  factory TokenBalance.fromJson(Map<String, dynamic> json) {
    return TokenBalance(
      balance: json['balance'] ?? 0,
      totalPurchased: json['totalPurchased'] ?? 0,
      totalUsed: json['totalUsed'] ?? 0,
    );
  }
}
```

---

## Design Generation Flow

### 1. Upload Image

```dart
// lib/features/design/services/design_service.dart

class DesignService {
  final ApiService _api;
  
  DesignService(this._api);

  // Upload image from gallery/camera
  Future<UploadResult> uploadImage(File imageFile) async {
    final response = await _api.uploadImage('/designs/upload', imageFile);
    return UploadResult.fromJson(response['data']);
  }

  // Get presigned URL for direct upload
  Future<PresignedUrl> getUploadUrl({String contentType = 'image/jpeg'}) async {
    final response = await _api.get('/designs/upload-url?contentType=$contentType');
    return PresignedUrl.fromJson(response['data']);
  }
}

class UploadResult {
  final String url;
  final String key;
  final int? width;
  final int? height;
  final int? size;

  UploadResult({
    required this.url,
    required this.key,
    this.width,
    this.height,
    this.size,
  });

  factory UploadResult.fromJson(Map<String, dynamic> json) {
    return UploadResult(
      url: json['url'],
      key: json['key'],
      width: json['width'],
      height: json['height'],
      size: json['size'],
    );
  }
}
```

### 2. Create Design

```dart
// Design creation with style selection

Future<Design> createDesign({
  required String originalImageUrl,
  required String originalImageKey,
  required String style,
  String? roomType,
  String? title,
  String? customPrompt,
}) async {
  final response = await _api.post('/designs', body: {
    'originalImageUrl': originalImageUrl,
    'originalImageKey': originalImageKey,
    'style': style,
    'roomType': roomType ?? 'other',
    'title': title,
    'customPrompt': customPrompt,
  });
  
  return Design.fromJson(response['data']);
}
```

### 3. Poll for Status

```dart
// Poll design status until completed

Future<Design> waitForCompletion(String designId, {
  Duration pollInterval = const Duration(seconds: 3),
  Duration timeout = const Duration(minutes: 5),
}) async {
  final startTime = DateTime.now();
  
  while (true) {
    if (DateTime.now().difference(startTime) > timeout) {
      throw TimeoutException('Design processing timed out');
    }
    
    final response = await _api.get('/designs/$designId/status');
    final status = response['data']['status'];
    
    if (status == 'completed') {
      return await getDesign(designId);
    }
    
    if (status == 'failed') {
      throw DesignFailedException(
        response['data']['processing']?['error'] ?? 'Unknown error',
      );
    }
    
    await Future.delayed(pollInterval);
  }
}
```

### 4. Complete Flow Example

```dart
// lib/features/design/screens/design_screen.dart

class _DesignScreenState extends State<DesignScreen> {
  final DesignService _designService = getIt<DesignService>();
  
  DesignStatus _status = DesignStatus.idle;
  Design? _design;
  String? _error;

  Future<void> _generateDesign(File imageFile, String style) async {
    setState(() {
      _status = DesignStatus.uploading;
      _error = null;
    });

    try {
      // Step 1: Upload image
      final uploadResult = await _designService.uploadImage(imageFile);
      
      setState(() => _status = DesignStatus.processing);
      
      // Step 2: Create design
      final design = await _designService.createDesign(
        originalImageUrl: uploadResult.url,
        originalImageKey: uploadResult.key,
        style: style,
        roomType: 'living_room',
      );
      
      // Step 3: Wait for completion
      final completedDesign = await _designService.waitForCompletion(design.id);
      
      setState(() {
        _status = DesignStatus.completed;
        _design = completedDesign;
      });
      
    } on InsufficientTokensException catch (e) {
      setState(() {
        _status = DesignStatus.error;
        _error = 'Not enough tokens. Please purchase more.';
      });
      _showPurchaseDialog();
      
    } on DesignFailedException catch (e) {
      setState(() {
        _status = DesignStatus.error;
        _error = e.message;
      });
      
    } catch (e) {
      setState(() {
        _status = DesignStatus.error;
        _error = 'An error occurred. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    switch (_status) {
      case DesignStatus.idle:
        return _buildImagePicker();
      case DesignStatus.uploading:
        return _buildProgress('Uploading image...');
      case DesignStatus.processing:
        return _buildProgress('AI is transforming your room...');
      case DesignStatus.completed:
        return _buildResult(_design!);
      case DesignStatus.error:
        return _buildError(_error!);
    }
  }
}

enum DesignStatus { idle, uploading, processing, completed, error }
```

---

## Token Management

### 1. Check Balance

```dart
class TokenService {
  final ApiService _api;
  
  TokenService(this._api);

  Future<TokenBalance> getBalance() async {
    final response = await _api.get('/tokens/balance');
    return TokenBalance.fromJson(response['data']);
  }

  Future<List<TokenPackage>> getPackages() async {
    final response = await _api.get('/tokens/packages');
    return (response['data'] as List)
        .map((p) => TokenPackage.fromJson(p))
        .toList();
  }

  Future<void> purchaseTokens({
    required String packageId,
    required String paymentMethod,
    required String transactionId,
    String? receiptData,
  }) async {
    await _api.post('/tokens/purchase', body: {
      'packageId': packageId,
      'paymentMethod': paymentMethod,
      'transactionId': transactionId,
      'receiptData': receiptData,
    });
  }

  Future<void> applyPromoCode(String code) async {
    await _api.post('/tokens/promo', body: {'code': code});
  }
}
```

### 2. In-App Purchase Integration

```dart
// lib/features/store/services/purchase_service.dart

class PurchaseService {
  final TokenService _tokenService;
  
  Future<void> purchasePackage(TokenPackage package) async {
    // 1. Initiate platform purchase
    final purchaseDetails = await InAppPurchase.instance.buyNonConsumable(
      purchaseParam: PurchaseParam(productDetails: package.productDetails),
    );
    
    // 2. Wait for purchase completion
    await for (final purchase in InAppPurchase.instance.purchaseStream) {
      if (purchase.status == PurchaseStatus.purchased) {
        // 3. Verify with backend
        await _tokenService.purchaseTokens(
          packageId: package.id,
          paymentMethod: Platform.isIOS ? 'apple_pay' : 'google_pay',
          transactionId: purchase.purchaseID!,
          receiptData: purchase.verificationData.serverVerificationData,
        );
        
        // 4. Complete purchase
        await InAppPurchase.instance.completePurchase(purchase);
        break;
      }
    }
  }
}
```

---

## Error Handling

### API Error Handler

```dart
// lib/core/utils/error_handler.dart

class ErrorHandler {
  static String getMessageForException(dynamic error) {
    if (error is ApiException) {
      switch (error.statusCode) {
        case 401:
          return 'Please log in again';
        case 402:
          return 'Insufficient tokens. Please purchase more.';
        case 403:
          return 'Access denied';
        case 404:
          return 'Not found';
        case 429:
          return 'Too many requests. Please wait.';
        default:
          return error.message;
      }
    }
    
    if (error is SocketException) {
      return 'No internet connection';
    }
    
    if (error is TimeoutException) {
      return 'Request timed out';
    }
    
    return 'An unexpected error occurred';
  }
  
  static bool shouldRefreshToken(dynamic error) {
    return error is TokenExpiredException ||
        (error is ApiException && error.statusCode == 401);
  }
}
```

### Retry Logic

```dart
// Auto retry with token refresh

Future<T> withRetry<T>(Future<T> Function() action) async {
  try {
    return await action();
  } on TokenExpiredException {
    await _authService.refreshToken();
    return await action();
  }
}

// Usage
final user = await withRetry(() => _authService.getCurrentUser());
```

---

## Örnek Kod

### Complete Design Flow Widget

```dart
class DesignGeneratorWidget extends StatefulWidget {
  @override
  _DesignGeneratorWidgetState createState() => _DesignGeneratorWidgetState();
}

class _DesignGeneratorWidgetState extends State<DesignGeneratorWidget> {
  final _designService = getIt<DesignService>();
  final _tokenService = getIt<TokenService>();
  
  File? _selectedImage;
  String _selectedStyle = 'scandinavian';
  bool _isLoading = false;
  Design? _result;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Token balance display
        FutureBuilder<TokenBalance>(
          future: _tokenService.getBalance(),
          builder: (context, snapshot) {
            if (snapshot.hasData) {
              return TokenBadge(balance: snapshot.data!.balance);
            }
            return const SizedBox.shrink();
          },
        ),
        
        // Image picker
        ImagePickerWidget(
          onImageSelected: (file) => setState(() => _selectedImage = file),
        ),
        
        // Style selector
        StyleSelector(
          selectedStyle: _selectedStyle,
          onStyleSelected: (style) => setState(() => _selectedStyle = style),
        ),
        
        // Generate button
        ElevatedButton(
          onPressed: _selectedImage != null && !_isLoading
              ? _generateDesign
              : null,
          child: _isLoading
              ? const CircularProgressIndicator()
              : const Text('Transform Room'),
        ),
        
        // Result display
        if (_result != null)
          BeforeAfterWidget(
            beforeUrl: _result!.originalImage.url,
            afterUrl: _result!.generatedImage!.url,
          ),
      ],
    );
  }

  Future<void> _generateDesign() async {
    setState(() => _isLoading = true);
    
    try {
      // Upload
      final upload = await _designService.uploadImage(_selectedImage!);
      
      // Create design
      final design = await _designService.createDesign(
        originalImageUrl: upload.url,
        originalImageKey: upload.key,
        style: _selectedStyle,
      );
      
      // Wait for completion
      final result = await _designService.waitForCompletion(design.id);
      
      setState(() => _result = result);
      
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHandler.getMessageForException(e))),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }
}
```

---

## Checklist

- [ ] API client kurulumu tamamlandı
- [ ] Authentication flow implement edildi
- [ ] Token'lar güvenli şekilde saklanıyor
- [ ] Image upload çalışıyor
- [ ] Design generation flow tamamlandı
- [ ] Status polling implement edildi
- [ ] Error handling eklendi
- [ ] Token management entegre edildi
- [ ] In-app purchase entegrasyonu yapıldı

