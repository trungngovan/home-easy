# Home Easy API (DRF)

- Base URL: `https://<host>/api/`
- Auth: JWT Bearer `Authorization: Bearer <access-token>`
- Schema: `/api/schema/`
- Swagger: `/api/docs/`

## Auth & Users (identity)
| Method & Path | Body | Response (chính) | Ghi chú |
| --- | --- | --- | --- |
| POST `/auth/token/` | `{email, password}` | `{access, refresh, user:{id,email,full_name,phone,avatar,role,can_access_web}}` | Mobile login (tenant/landlord) |
| POST `/auth/web/token/` | `{email, password}` | như trên, lỗi: `{"error":"web_access_denied",...}` | Web login (chặn tenant) |
| POST `/auth/token/refresh/` | `{refresh}` | `{access, refresh}` |  |
| POST `/auth/register/` | `{email, phone, password, full_name, role?}` | `User` | Mặc định role=tenant |
| POST `/auth/register/landlord/` | `{email, phone, password, full_name}` | `{id,email,full_name,role,message}` |  |
| GET `/auth/me/` |  | `User` |  |
| PATCH `/auth/me/` | partial `User` fields | `User` |  |
| `/users/` (ModelViewSet) | CRUD user | `User` | Tenant chỉ thấy chính mình; landlord/superuser thấy tất cả |

`User` fields: `id,email,phone,full_name,avatar,role,is_active,can_access_web,created_at,updated_at`.

## Properties
| Method & Path | Body | Response | Filters/Notes |
| --- | --- | --- | --- |
| `/properties/` (list/create) | property fields | `PropertyList` | Filters: `search` (name/address), `owner`; order `created_at,name`; tenant thấy rỗng, landlord chỉ của mình |
| `/properties/{id}/` (retrieve/update/delete) | property fields | `Property` |  |
| `/rooms/` (list/create) | room fields | `Room` | Filters: `building,status,floor`, search room_number/building, order `created_at,room_number,floor,base_rent`; tenant chỉ phòng đang thuê, landlord phòng của mình |
| `/rooms/{id}/` | room fields | `Room` |  |

`PropertyList` thêm `total_rooms,vacant_rooms,occupied_rooms,maintenance_rooms,occupancy_rate`.
`Room` fields: `id,building,room_number,floor,area,base_rent,status(vacant/occupied/maintenance),description,image,created_at,updated_at` + `status_display,building_detail`.

## Tenancies
| Method & Path | Body | Response | Filters/Notes |
| --- | --- | --- | --- |
| `/tenancies/` (list/create) | tenancy fields | `Tenancy` | Filters: `status,room,tenant,room__building`; search room/tenant; order `created_at,start_date,end_date,base_rent`; tenant chỉ tenancy của mình, landlord của property mình |
| `/tenancies/{id}/` | tenancy fields | `Tenancy` |  |

`Tenancy` fields: `id,room,tenant,start_date,end_date?,deposit,base_rent,status(active/expired/terminated),contract_file,notes,created_at,updated_at` + `status_display,is_active,days_remaining,room_detail,tenant_detail`.

## Pricing (service prices)
| Method & Path | Body | Response | Filters/Notes |
| --- | --- | --- | --- |
| `/prices/` (list/create) | `property,service_type(electricity,water,internet,cleaning,parking,other),name?,unit_price,unit,is_recurring` | `ServicePrice` | Filters: `property,service_type,is_recurring`; order `created_at,service_type,unit_price`; tenant không xem |
| `/prices/{id}/` | same | `ServicePrice` |  |

`ServicePrice` có `service_type_display,display_name,property_detail`.

## Metering
| Method & Path | Body | Response | Filters/Notes |
| --- | --- | --- | --- |
| `/meter-readings/` (list/create) | `room,period(YYYY-MM),electricity_old,new?,water_old,new?,source(manual/ocr),ocr_image?,ocr_payload?,notes` | `MeterReading` | Filters: `room,room__building,period,source`; search room_number/period; order `created_at,period`; tenant chỉ phòng đang thuê, landlord phòng của mình |
| `/meter-readings/{id}/` | same | `MeterReading` |  |

`MeterReading` có read-only `electricity_usage,water_usage,source_display,room_detail`.

## Billing
| Method & Path | Body | Response | Filters/Notes |
| --- | --- | --- | --- |
| `/invoices/` (list/create) | `tenancy,period,total_amount,amount_due?,status?,due_date?,issued_at?,paid_at?,notes,lines?[]` | `Invoice` | Filters: `status,period,tenancy__room__building,tenancy`; search room_number/period/notes; order `created_at,period,total_amount,due_date`; tenant chỉ hóa đơn của mình, landlord của property mình |
| `/invoices/{id}/` | same | `Invoice` |  |
| GET `/invoices/{id}/download/` |  | PDF |  |
| `/invoice-lines/` (list/create) | `invoice,item_type(rent,deposit,electricity,water,internet,cleaning,service,adjustment),description?,quantity,unit_price,amount,meta?` | `InvoiceLine` | Filter `invoice,item_type`; role filter theo invoice |
| `/invoice-lines/{id}/` | same | `InvoiceLine` |  |

`Invoice` fields: `id,tenancy,period,total_amount,amount_due,status(draft/pending/partial/paid/overdue),due_date,issued_at,paid_at,notes,created_at,updated_at,lines[]` + `status_display,is_overdue,total_paid,payment_count,tenancy_detail`.

## Payments
| Method & Path | Body | Response | Filters/Notes |
| --- | --- | --- | --- |
| `/payments/` (list/create) | `invoice,amount,method(cash,bank_transfer,momo,vnpay,other),status(pending/completed/failed/refunded),provider_ref?,note?` | `Payment` | Filters: `status,method,invoice,invoice__tenancy__room__building`; search provider_ref/note; order `created_at,amount,status`; tenant chỉ payment hóa đơn mình, landlord payment property mình |
| `/payments/{id}/` | same | `Payment` |  |

`Payment` có `method_display,status_display,invoice_detail(room+tenant)`.

## Maintenance
| Method & Path | Body | Response | Filters/Notes |
| --- | --- | --- | --- |
| `/maintenance/requests/` (list/create) | `room,requester,title,description,category(electricity,plumbing,appliance,furniture,internet,other),ai_predicted_category?,ai_confidence?,status?,assignee?,resolved_at?,resolution_note?` | `MaintenanceRequest` | Filters: `status,category,room,room__building,requester,assignee`; search title/description/room_number; order `created_at,status,category`; tenant chỉ request của mình, landlord request thuộc property mình |
| `/maintenance/requests/{id}/` | same | `MaintenanceRequest` |  |
| `/maintenance/attachments/` (list/create) | `request,file` | `MaintenanceAttachment` | Filter `request`; role filter theo request |
| `/maintenance/attachments/{id}/` |  |  |  |

`MaintenanceRequest` có `category_display,status_display,room_detail,requester_detail,assignee_detail,attachments[]`.
`MaintenanceAttachment` có `file_url,uploaded_at`.

## Files (upload)
| Method & Path | Body | Response | Notes |
| --- | --- | --- | --- |
| `/files/` (list/create) | multipart `{file, purpose? (contract|meter|maintenance, default=contract)}` | `{id,file,path,url,mime_type,purpose,created_at}` | Auth required |
| `/files/{id}/` |  |  | DELETE supported |

## Invites
| Method & Path | Body | Response | Filters/Notes |
| --- | --- | --- | --- |
| `/invites/` (list/create) | `property,room,email?,phone?,token,role,status?,expires_at?` | `Invite` | Filters: `status,room,property`; search email/phone; order `created_at,expires_at`; tenant chỉ invite gửi tới email/phone họ, landlord invite của property mình |
| `/invites/{id}/` | same | `Invite` |  |

`Invite` có `property_detail,room_detail,is_expired,status_display`.

## Notifications
| Method & Path | Body | Response | Filters/Notes |
| --- | --- | --- | --- |
| `/notifications/` (list/create) | `user,channel(inapp/email/push),template,payload` | `Notification` | Filters: `channel,user,template`; order `created_at,sent_at`; user chỉ xem của mình (superuser xem tất) |
| `/notifications/{id}/` |  |  |  |
| GET `/notifications/my-notifications/` |  | list `Notification` | Nhanh lấy thông báo current user |

`Notification` có `channel_display,is_sent,created_at,sent_at`.

## Quy ước lỗi & paging
- Validation DRF: `{field: [messages]}`
- 401: chưa đăng nhập; 403: sai role / không có quyền; 404: không tìm thấy
- Paging DRF: hỗ trợ `?page=` nếu bật default pagination
