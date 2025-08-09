package com.restspotfinder.domain.notice.controller;

import com.restspotfinder.domain.notice.dto.NoticeCreate;
import com.restspotfinder.domain.notice.entity.Notice;
import com.restspotfinder.domain.notice.service.NoticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@Tag(name = "공지사항[Notice] API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notice")
public class NoticeController {
    private final NoticeService noticeService;

    @Operation(summary = "공지사항 목록 조회")
    @GetMapping
    public ResponseEntity<?> getNoticeList() {
        List<Notice> notice = noticeService.getNoticeList();
        
        return ResponseEntity.ok(notice);
    }

    @Operation(summary = "공지사항 등록")
    @PostMapping
    public ResponseEntity<?> write(@Validated @RequestBody NoticeCreate noticeCreate) {
        Notice notice = noticeService.create(noticeCreate.title(), noticeCreate.content());
        
        return ResponseEntity.ok(notice);
    }
}